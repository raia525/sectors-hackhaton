import "server-only";
import { Prisma, type MarketRun, type RunItem, type SignalSnapshot } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { analyzeSymbol } from "@/lib/analysis/service";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import { getCreditsSpent, getSectorsClient } from "@/lib/sectors/server";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import type { ShadowPoint } from "@/lib/shadow/types";
import { deliverAlerts, type StoredAnalysis } from "@/lib/notifications/dispatch";
import { renderBriefEmail } from "@/lib/notifications/email";
import { sendMail } from "@/lib/notifications/mailer";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { jakartaDate, jakartaWeekday } from "./dates";
import { forwardOutcome } from "./forward";
import { buildBrief, type BriefRow } from "./brief";
import { buildCalendar } from "./calendar";

/**
 * The daily automated run.
 *
 * One call is one step: it analyses as many stocks as fit in a time budget,
 * then reports whether work remains so the caller can trigger another step.
 * Splitting the day into one queue item per stock is what keeps it inside a
 * hosting plan's function time limit, and a claim on each item means two
 * overlapping steps never analyse the same stock twice.
 *
 * Credits: the run is capped (AUTOMATION_DAILY_CREDIT_CAP) and draws only on
 * the ledger's non-reserved budget, so it can never spend what is held back
 * for the live demo. Watched stocks are queued first, so when the cap bites
 * it is the default list that goes without, not someone's alerts.
 */

/** A claim older than this is assumed dead (its function timed out). */
const STALE_CLAIM_MS = 3 * 60 * 1000;
/** Tries per stock before it is marked failed for the day. */
const MAX_ATTEMPTS = 2;
/** Self-triggered continuations per run, a backstop against a runaway chain. */
export const MAX_CONTINUATIONS = 40;

export interface StepResult {
  runDate: string;
  status: MarketRun["status"];
  analysed: string[];
  remaining: number;
  needsContinuation: boolean;
  delivered: boolean;
}

export async function runPipelineStep(options: {
  now?: Date;
  /** Stop starting new stocks after this long. */
  budgetMs?: number;
  /** Site origin, for the link in the brief email. */
  origin: string;
}): Promise<StepResult> {
  const now = options.now ?? new Date();
  const budgetMs = options.budgetMs ?? 25_000;
  const started = Date.now();

  const run = await ensureRun(now);
  const analysed: string[] = [];

  if (run.status === "ANALYSING") {
    while (Date.now() - started < budgetMs) {
      const current = await prisma.marketRun.findUniqueOrThrow({ where: { id: run.id } });
      if (current.creditsSpent >= current.creditCap) {
        // Checked before each stock, so the run can end up to one stock's
        // cost over the cap; stopping mid-analysis would waste what was spent.
        await prisma.runItem.updateMany({
          where: { runId: run.id, status: "PENDING" },
          data: { status: "SKIPPED", error: "credit cap reached" },
        });
        break;
      }

      const item = await claimNext(run.id);
      if (!item) break;
      await processItem(run, item);
      analysed.push(item.symbol);
    }

    const remaining = await prisma.runItem.count({
      where: { runId: run.id, status: { in: ["PENDING", "RUNNING"] } },
    });
    if (remaining > 0) {
      return {
        runDate: run.runDate,
        status: "ANALYSING",
        analysed,
        remaining,
        needsContinuation: true,
        delivered: false,
      };
    }
  }

  const delivered = await deliverOnce(run.id, now, options.origin);
  const final = await prisma.marketRun.findUniqueOrThrow({ where: { id: run.id } });
  return {
    runDate: run.runDate,
    status: final.status,
    analysed,
    remaining: 0,
    needsContinuation: false,
    delivered,
  };
}

/**
 * Counts a continuation against the run's cap. Returns false once the cap is
 * reached, which stops the chain.
 */
export async function recordContinuation(runDate: string): Promise<boolean> {
  const updated = await prisma.marketRun.updateMany({
    where: { runDate, continuations: { lt: MAX_CONTINUATIONS } },
    data: { continuations: { increment: 1 } },
  });
  return updated.count === 1;
}

/** The latest run, for the brief page and the health check. */
export async function latestRun() {
  return prisma.marketRun.findFirst({
    orderBy: { runDate: "desc" },
    include: { items: { orderBy: { position: "asc" } } },
  });
}

/** Today's run, created with its queue on first call. */
async function ensureRun(now: Date): Promise<MarketRun> {
  const runDate = jakartaDate(now);
  const existing = await prisma.marketRun.findUnique({ where: { runDate } });
  if (existing) return existing;

  // A previous day that never finished is left as it was, marked abandoned:
  // sending yesterday's alerts today would present stale moves as news.
  await prisma.marketRun.updateMany({
    where: { runDate: { lt: runDate }, status: { in: ["ANALYSING", "DELIVERING"] } },
    data: { status: "ABANDONED" },
  });

  const symbols = await queueOrder();

  try {
    return await prisma.marketRun.create({
      data: {
        runDate,
        creditCap: getEnv().AUTOMATION_DAILY_CREDIT_CAP,
        items: { create: symbols.map((symbol, position) => ({ symbol, position })) },
      },
    });
  } catch (error) {
    // Two steps starting at once: the other one created it first.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.marketRun.findUniqueOrThrow({ where: { runDate } });
    }
    throw error;
  }
}

/** Watched stocks first, most watched first, then the default universe. */
async function queueOrder(): Promise<string[]> {
  const watched = await prisma.watchlistItem.groupBy({
    by: ["symbol"],
    where: { user: { emailVerifiedAt: { not: null } } },
    _count: { symbol: true },
    orderBy: { _count: { symbol: "desc" } },
  });

  // The admin-managed list wins when it has any active stock; otherwise the
  // MARKET_UNIVERSE environment variable, so a fresh deploy still has one.
  const managed = await prisma.universeStock.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { symbol: true },
  });
  const universe =
    managed.length > 0
      ? managed.map((m) => m.symbol)
      : getEnv()
          .MARKET_UNIVERSE.split(",")
          .map((s) => normalizeSymbol(s))
          .filter((s): s is string => s !== null);

  return [...new Set([...watched.map((w) => w.symbol), ...universe])];
}

async function claimNext(runId: string): Promise<RunItem | null> {
  // A few tries, since another step may win the race for the same row.
  for (let i = 0; i < 5; i += 1) {
    const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
    const candidate = await prisma.runItem.findFirst({
      where: {
        runId,
        OR: [{ status: "PENDING" }, { status: "RUNNING", claimedAt: { lt: staleBefore } }],
      },
      orderBy: { position: "asc" },
    });
    if (!candidate) return null;

    if (candidate.attempts >= MAX_ATTEMPTS) {
      await prisma.runItem.updateMany({
        where: { id: candidate.id, status: candidate.status },
        data: { status: "FAILED", error: candidate.error ?? "timed out" },
      });
      continue;
    }

    const claimed = await prisma.runItem.updateMany({
      where: { id: candidate.id, status: candidate.status, attempts: candidate.attempts },
      data: { status: "RUNNING", claimedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count === 1) {
      return { ...candidate, status: "RUNNING", attempts: candidate.attempts + 1 };
    }
  }
  return null;
}

async function processItem(run: MarketRun, item: RunItem): Promise<void> {
  // Spending is attributed by reading the ledger before and after. A web
  // visitor analysing at the same moment would be counted here too, which
  // errs on the side of stopping the run early, never of overspending.
  const before = await getCreditsSpent();

  try {
    const result = await analyzeSymbol(item.symbol, { includeSmartMoney: true });
    // Served from the cache: analyzeSymbol fetched the same URL moments ago.
    const corporateActions = await getSectorsClient()
      .corporateActions(item.symbol)
      .catch(() => null);

    const { shadow, realityCheck, smartMoney } = result;
    const fields = {
      asOf: shadow.asOf,
      companyName: result.companyName,
      sector: result.sector,
      zScore: shadow.zScore,
      verdict: shadow.verdict,
      fitQuality: shadow.fitQuality,
      constituentCount: shadow.constituents.length,
      totalReturn: shadow.attribution.total,
      marketReturn: shadow.attribution.market,
      sectorReturn: shadow.attribution.sector,
      idioReturn: shadow.attribution.idiosyncratic,
      realityVerdict: realityCheck.verdict,
      smartMoneyType: smartMoney?.type ?? null,
      smartMoneyConviction: smartMoney?.conviction ?? null,
      analysis: toJson({ shadow, realityCheck, smartMoney }),
      corporateActions: corporateActions === null ? Prisma.JsonNull : toJson(corporateActions),
    };

    await prisma.signalSnapshot.upsert({
      where: { symbol_runDate: { symbol: item.symbol, runDate: run.runDate } },
      create: { symbol: item.symbol, runDate: run.runDate, ...fields },
      update: fields,
    });

    await resolveEarlierSignals(item.symbol, run.runDate, shadow.series);
    await finishItem(run.id, item.id, "DONE", null, before);
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 300) : "Unknown failure";
    const status = item.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING";
    await finishItem(run.id, item.id, status, reason, before);
  }
}

async function finishItem(
  runId: string,
  itemId: string,
  status: RunItem["status"],
  error: string | null,
  creditsBefore: number,
): Promise<void> {
  const spent = Math.max(0, (await getCreditsSpent()) - creditsBefore);
  await prisma.$transaction([
    prisma.runItem.update({
      where: { id: itemId },
      data: { status, error, creditsSpent: { increment: spent } },
    }),
    prisma.marketRun.update({
      where: { id: runId },
      data: { creditsSpent: { increment: spent } },
    }),
  ]);
}

/**
 * Fills in what happened after earlier snapshots of this stock, now that a
 * newer series covers the sessions that followed them. Costs nothing: it
 * reads the series this run has just computed.
 */
async function resolveEarlierSignals(
  symbol: string,
  runDate: string,
  series: ShadowPoint[],
): Promise<void> {
  const open = await prisma.signalSnapshot.findMany({
    where: { symbol, resolvedAt: null, runDate: { lt: runDate } },
    select: { id: true, asOf: true },
  });

  for (const snapshot of open) {
    if (!snapshot.asOf) continue;
    const result = forwardOutcome(series, snapshot.asOf);
    if (result.status === "pending") continue;

    await prisma.signalSnapshot.update({
      where: { id: snapshot.id },
      data:
        result.status === "resolved"
          ? {
              forwardSessions: result.outcome.sessions,
              forwardStockReturn: result.outcome.stockReturn,
              forwardTwinReturn: result.outcome.twinReturn,
              resolvedAt: new Date(),
            }
          : // Left the window for good: closed with no outcome, so it is
            // neither counted nor retried.
            { resolvedAt: new Date() },
    });
  }
}

/**
 * Sends the day's alerts and brief emails exactly once, whichever step
 * finishes the queue. A delivery that crashed partway is retried after the
 * stale window rather than never.
 */
async function deliverOnce(runId: string, now: Date, origin: string): Promise<boolean> {
  const claimed = await prisma.marketRun.updateMany({
    where: {
      id: runId,
      OR: [
        { status: "ANALYSING" },
        { status: "DELIVERING", updatedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
      ],
    },
    data: { status: "DELIVERING" },
  });
  if (claimed.count === 0) return false;

  const run = await prisma.marketRun.findUniqueOrThrow({ where: { id: runId } });
  const snapshots = await prisma.signalSnapshot.findMany({ where: { runDate: run.runDate } });

  const analyses = new Map<string, StoredAnalysis>();
  for (const s of snapshots) {
    const stored = s.analysis as unknown as Pick<StoredAnalysis, "shadow" | "realityCheck">;
    analyses.set(s.symbol, { ...stored, corporateActions: s.corporateActions });
  }

  await deliverAlerts(analyses, now);
  await sendBriefEmails(run.runDate, snapshots, now, origin);

  await prisma.marketRun.update({
    where: { id: runId },
    data: { status: "DONE", deliveredAt: new Date() },
  });
  return true;
}

export function toBriefRow(s: SignalSnapshot): BriefRow {
  return {
    symbol: s.symbol,
    companyName: s.companyName,
    sector: s.sector,
    zScore: s.zScore,
    verdict: s.verdict,
    fitQuality: s.fitQuality,
    constituentCount: s.constituentCount,
    totalReturn: s.totalReturn,
    marketReturn: s.marketReturn,
    sectorReturn: s.sectorReturn,
    idioReturn: s.idioReturn,
    realityVerdict: s.realityVerdict,
    smartMoneyType: s.smartMoneyType,
    smartMoneyConviction: s.smartMoneyConviction,
  };
}

async function sendBriefEmails(
  runDate: string,
  snapshots: SignalSnapshot[],
  now: Date,
  origin: string,
): Promise<void> {
  if (snapshots.length === 0) return;

  const brief = buildBrief(snapshots.map(toBriefRow));
  const recipients = await prisma.user.findMany({
    where: { briefOptIn: true, emailVerifiedAt: { not: null } },
    include: { watchlistItems: true, holdings: true },
  });

  // The week-ahead calendar rides along on Mondays only, so it reads as a
  // weekly plan rather than the same list repeated every day.
  const includeCalendar = jakartaWeekday(now) === 1;
  const actionsBySymbol = new Map(snapshots.map((s) => [s.symbol, s.corporateActions]));

  for (const user of recipients) {
    try {
      const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
      const holdingBySymbol = new Map(user.holdings.map((h) => [h.symbol, h]));

      const calendar = includeCalendar
        ? buildCalendar(
            user.watchlistItems.map((w) => {
              const holding = holdingBySymbol.get(w.symbol);
              return {
                symbol: w.symbol,
                items: summarizeCorporateActions(
                  actionsBySymbol.get(w.symbol) ?? null,
                  holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
                  now,
                ),
              };
            }),
            now,
          )
        : [];

      const { subject, html, text } = renderBriefEmail(locale, user.name, {
        runDate,
        brief,
        calendar,
        briefUrl: `${origin}/brief`,
      });
      await sendMail({ to: user.email, subject, html, text });
    } catch (error) {
      console.error(
        "Brief email failed for one user:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}

/** Plain JSON for a Json column: drops undefined and class instances. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
