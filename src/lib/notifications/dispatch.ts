import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import type { ShadowAnalysis } from "@/lib/shadow/types";
import {
  buildDigest,
  evaluateCorporateActionAlerts,
  evaluateDivergenceAlert,
  type Alert,
  type WatchState,
} from "./rules";
import { renderDigestEmail } from "./email";
import { sendMail } from "./mailer";
import { renderMessage } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import type { WatchFacts } from "@/lib/intelligence/watch-facts";
import { evaluateRules, retune, type RuleOutcome, type RuleState } from "./custom-rules";

/**
 * Watchlist alert delivery.
 *
 * Works from analyses the daily run has already stored (see
 * src/lib/intelligence/pipeline.ts) rather than analysing anything itself.
 * Each symbol is analysed once however many users watch it, and delivery
 * never spends a credit.
 *
 * Partial failure: one user's delivery failing must not silence everyone
 * else's alerts, so each user is isolated and failures are counted.
 */

/** What delivery needs from one stock's stored analysis. */
export interface StoredAnalysis {
  shadow: ShadowAnalysis;
  realityCheck: RealityCheck;
  /** Raw corporate actions, summarised here against each user's holding. */
  corporateActions: unknown;
  /** Price, volume and key statistics, for the user's own alert rules. */
  facts: WatchFacts;
}

export interface DeliverySummary {
  alertsCreated: number;
  emailsSent: number;
  /** Watched symbols with no analysis today, for example past the credit cap. */
  notAnalysed: string[];
  failures: number;
}

export async function deliverAlerts(
  analyses: Map<string, StoredAnalysis>,
  now = new Date(),
  /** The signal bar auto-adjusting divergence rules start from. */
  signalZ = 2,
): Promise<DeliverySummary> {
  const summary: DeliverySummary = {
    alertsCreated: 0,
    emailsSent: 0,
    notAnalysed: [],
    failures: 0,
  };

  const watchItems = await prisma.watchlistItem.findMany({
    // Only verified accounts: an unverified address may not belong to the
    // person who typed it, and must not start receiving mail.
    where: { user: { emailVerifiedAt: { not: null } } },
    include: {
      user: { select: { id: true, email: true, name: true, locale: true } },
      rules: true,
    },
  });

  const notAnalysed = new Set<string>();
  const byUser = new Map<string, typeof watchItems>();
  for (const item of watchItems) {
    if (!analyses.has(item.symbol)) notAnalysed.add(item.symbol);
    const bucket = byUser.get(item.userId);
    if (bucket) bucket.push(item);
    else byUser.set(item.userId, [item]);
  }
  summary.notAnalysed = [...notAnalysed].sort();

  for (const [userId, items] of byUser) {
    try {
      const delivered = await deliverToUser(userId, items, analyses, now, signalZ);
      summary.alertsCreated += delivered.alerts;
      if (delivered.emailed) summary.emailsSent += 1;
    } catch (error) {
      summary.failures += 1;
      console.error(
        "Alert delivery failed for one user:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return summary;
}

type WatchItemWithUser = Prisma.WatchlistItemGetPayload<{
  include: { user: { select: { id: true; email: true; name: true; locale: true } }; rules: true };
}>;

async function deliverToUser(
  userId: string,
  items: WatchItemWithUser[],
  analyses: Map<string, StoredAnalysis>,
  now: Date,
  signalZ: number,
): Promise<{ alerts: number; emailed: boolean }> {
  const alerts: Alert[] = [];
  const touched: { id: string; z: number }[] = [];
  const ruleUpdates: { outcome: RuleOutcome; nextValue: number | null }[] = [];

  const holdings = await prisma.holding.findMany({ where: { userId } });
  const holdingBySymbol = new Map(holdings.map((h) => [h.symbol, h]));

  for (const item of items) {
    const analysis = analyses.get(item.symbol);
    if (!analysis) continue;

    const state: WatchState = {
      symbol: item.symbol,
      zScoreThreshold: item.zScoreThreshold,
      notifyOnCorporateAction: item.notifyOnCorporateAction,
      notifyOnSmartMoney: item.notifyOnSmartMoney,
      lastNotifiedAt: item.lastNotifiedAt,
      lastNotifiedZ: item.lastNotifiedZ,
    };

    // The user's own rules on this stock, against the stored facts.
    if (item.rules.length > 0) {
      const states: RuleState[] = item.rules.map((r) => ({
        id: r.id,
        metric: r.metric,
        operator: r.operator,
        value: r.value,
        enabled: r.enabled,
        autoTune: r.autoTune,
        preset: r.preset,
        note: r.note,
        lastMet: r.lastMet,
      }));
      const evaluated = evaluateRules(states, analysis.facts);
      alerts.push(...evaluated.alerts);
      for (const outcome of evaluated.outcomes) {
        const rule = states.find((r) => r.id === outcome.id);
        ruleUpdates.push({ outcome, nextValue: rule ? retune(rule, analysis.facts, signalZ) : null });
      }
    }

    const divergence = evaluateDivergenceAlert(state, analysis.shadow, analysis.realityCheck, now);
    if (divergence) {
      alerts.push(divergence);
      touched.push({ id: item.id, z: analysis.shadow.zScore });
    }

    if (item.notifyOnCorporateAction && analysis.corporateActions) {
      const holding = holdingBySymbol.get(item.symbol);
      alerts.push(
        ...evaluateCorporateActionAlerts(
          state,
          summarizeCorporateActions(
            analysis.corporateActions,
            holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
            now,
          ),
          now,
        ),
      );
    }
  }

  if (alerts.length === 0) {
    await saveRuleStates(ruleUpdates, now);
    return { alerts: 0, emailed: false };
  }

  const digest = buildDigest(alerts);
  const user = items[0].user;
  const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);

  // Resolved to plain text in the recipient's locale at send time and stored
  // that way: a notification is a record of what was communicated, and
  // re-resolving it later under a changed locale or dictionary would
  // silently rewrite history.
  await prisma.notification.createMany({
    data: digest.alerts.map((alert) => ({
      userId,
      symbol: alert.symbol,
      kind: alert.kind,
      title: renderMessage(alert.title, t),
      body: alert.body.map((b) => renderMessage(b, t)).join(" "),
      payload: alert.payload as never,
    })),
  });

  // Recorded only after the notifications are persisted, so a crash mid-run
  // does not mark a symbol as notified without an alert existing.
  for (const touchedItem of touched) {
    await prisma.watchlistItem.update({
      where: { id: touchedItem.id },
      data: { lastNotifiedAt: now, lastNotifiedZ: touchedItem.z },
    });
  }

  await saveRuleStates(ruleUpdates, now);

  // Returns false rather than throwing when email is unconfigured or the
  // relay refuses: the in-app notifications are already saved at this point.
  const { subject, html, text } = renderDigestEmail(locale, user.name, digest);
  const emailed = await sendMail({ to: user.email, subject, html, text });

  return { alerts: digest.alerts.length, emailed };
}

/**
 * Records each rule's outcome: whether it was met (which re-arms it once
 * false), the value seen, when it last fired, and an auto-adjusted value
 * for the next run. A rule whose metric was unknown keeps its state.
 */
async function saveRuleStates(
  updates: { outcome: RuleOutcome; nextValue: number | null }[],
  now: Date,
): Promise<void> {
  for (const { outcome, nextValue } of updates) {
    if (outcome.met === null && nextValue === null) continue;
    await prisma.alertRule.update({
      where: { id: outcome.id },
      data: {
        ...(outcome.met === null
          ? {}
          : { lastMet: outcome.met, lastValue: outcome.value, lastCheckedAt: now }),
        ...(outcome.triggered ? { lastTriggeredAt: now } : {}),
        ...(nextValue === null ? {} : { value: nextValue, tunedAt: now }),
      },
    });
  }
}
