import "server-only";
import { prisma } from "@/lib/db";
import { analyzeSymbol } from "@/lib/analysis/service";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import { getSectorsClient } from "@/lib/sectors/server";
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

/**
 * Scheduled alert run.
 *
 * Two properties matter here beyond correctness.
 *
 * Credit cost: watchlists across users overlap heavily, so symbols are analysed
 * once and the result reused for every user watching them. Analysing per user
 * would multiply the credit cost by the number of subscribers for no benefit.
 *
 * Partial failure: one symbol failing must not abort the run and silence
 * everyone else's alerts, so each symbol is isolated and its failure recorded.
 */

export interface RunSummary {
  symbolsAnalysed: number;
  alertsCreated: number;
  emailsSent: number;
  failures: { symbol: string; reason: string }[];
  skipped: string[];
}

export async function runScheduledAlerts(now = new Date()): Promise<RunSummary> {
  const summary: RunSummary = {
    symbolsAnalysed: 0,
    alertsCreated: 0,
    emailsSent: 0,
    failures: [],
    skipped: [],
  };

  const watchItems = await prisma.watchlistItem.findMany({
    include: { user: { select: { id: true, email: true, name: true, locale: true } } },
  });

  if (watchItems.length === 0) return summary;

  // Analyse each distinct symbol once, however many users watch it.
  const symbols = [...new Set(watchItems.map((w) => w.symbol))];
  const analyses = new Map<string, Awaited<ReturnType<typeof analyzeSymbol>>>();

  for (const symbol of symbols) {
    try {
      analyses.set(symbol, await analyzeSymbol(symbol));
      summary.symbolsAnalysed += 1;
    } catch (error) {
      summary.failures.push({
        symbol,
        reason: error instanceof Error ? error.message : "Unknown failure",
      });
    }
  }

  // Group the work by user so each one receives a single digest.
  const byUser = new Map<string, typeof watchItems>();
  for (const item of watchItems) {
    const bucket = byUser.get(item.userId);
    if (bucket) bucket.push(item);
    else byUser.set(item.userId, [item]);
  }

  for (const [userId, items] of byUser) {
    const alerts: Alert[] = [];
    const touched: { id: string; z: number }[] = [];

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

      const divergence = evaluateDivergenceAlert(
        state,
        analysis.shadow,
        analysis.realityCheck,
        now,
      );
      if (divergence) {
        alerts.push(divergence);
        touched.push({ id: item.id, z: analysis.shadow.zScore });
      } else {
        summary.skipped.push(item.symbol);
      }

      if (item.notifyOnCorporateAction) {
        try {
          const holding = await prisma.holding.findUnique({
            where: { userId_symbol: { userId, symbol: item.symbol } },
          });
          const raw = await getSectorsClient().corporateActions(item.symbol);
          alerts.push(
            ...evaluateCorporateActionAlerts(
              state,
              summarizeCorporateActions(
                raw,
                holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
                now,
              ),
              now,
            ),
          );
        } catch {
          // Corporate actions are supplementary; a failure here must not cost
          // the user their divergence alerts.
        }
      }
    }

    if (alerts.length === 0) continue;

    const digest = buildDigest(alerts);
    const user = items[0].user;
    const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
    const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
      translate(locale, key, params);

    // Resolved to plain text in the recipient's locale at send time and
    // stored that way: a notification is a record of what was communicated,
    // and re-resolving it later under a changed locale or dictionary would
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
    summary.alertsCreated += digest.alerts.length;

    // Recorded only after the notifications are persisted, so a crash mid-run
    // does not mark a symbol as notified without an alert existing.
    for (const touchedItem of touched) {
      await prisma.watchlistItem.update({
        where: { id: touchedItem.id },
        data: { lastNotifiedAt: now, lastNotifiedZ: touchedItem.z },
      });
    }

    if (await sendDigestEmail(locale, user.email, user.name, digest)) {
      summary.emailsSent += 1;
    }
  }

  return summary;
}

/**
 * Sends the digest by email.
 *
 * Returns false rather than throwing when email is unconfigured or the relay
 * refuses: the in-app notifications are already saved at this point, so a mail
 * failure should degrade the run, not fail it and lose the alerts.
 */
async function sendDigestEmail(
  locale: Parameters<typeof renderDigestEmail>[0],
  email: string,
  name: string | null,
  digest: { alerts: Alert[]; omitted: number },
): Promise<boolean> {
  const { subject, html, text } = renderDigestEmail(locale, name, digest);
  return sendMail({ to: email, subject, html, text });
}
