import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { summarizeCorporateActions, type CorporateActionItem } from "@/lib/analysis/corporate-actions";
import { getSignalBars } from "@/lib/settings/server";
import { buildCalendar, type CalendarEntry } from "./calendar";
import { isSignal } from "./track-record";
import { readSnapshotFacts, type WatchFacts } from "./watch-facts";
import { portfolioFacts, type PortfolioFacts } from "./summary";

/**
 * A user's own stocks, read from the database once per request: the
 * watchlist with its rules, holdings, alerts on those stocks, upcoming
 * corporate actions and the latest stored analysis of each watched stock.
 * No credit is spent; a watched stock the daily run has not reached yet is
 * named, not fetched.
 */

/**
 * How far ahead the watchlist looks for corporate actions, in its
 * conclusion and its "Upcoming events" card alike, so one dividend never
 * shows under two different horizons.
 */
export const CONCLUSION_ACTION_DAYS = 30;

export interface WatchedStock {
  facts: WatchFacts;
  isSignal: boolean;
  actions: CorporateActionItem[];
  caveats: unknown;
}

export const loadPortfolio = cache(async (userId: string, now: Date = new Date()) => {
  const [items, holdings, bars] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { rules: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.holding.findMany({ where: { userId } }),
    getSignalBars(),
  ]);
  const symbols = items.map((i) => i.symbol);

  const [snapshots, unreadAlerts] = await Promise.all([
    symbols.length
      ? prisma.signalSnapshot.findMany({
          where: { symbol: { in: symbols } },
          orderBy: { runDate: "desc" },
          distinct: ["symbol"],
        })
      : Promise.resolve([]),
    // Only alerts about stocks still on the watchlist: one removed last week
    // is no longer this summary's business.
    prisma.notification.count({ where: { userId, readAt: null, symbol: { in: symbols } } }),
  ]);

  const holdingBySymbol = new Map(holdings.map((h) => [h.symbol, h]));
  const stocks = new Map<string, WatchedStock>();
  for (const snap of snapshots) {
    const holding = holdingBySymbol.get(snap.symbol);
    const facts = readSnapshotFacts(snap);
    stocks.set(snap.symbol, {
      facts,
      isSignal: isSignal(snap, bars),
      actions: summarizeCorporateActions(
        snap.corporateActions,
        holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
        now,
      ),
      caveats: snap.analysis,
    });
  }

  const bySymbol = [...stocks.entries()].map(([symbol, s]) => ({ symbol, items: s.actions }));
  const upcoming: CalendarEntry[] = buildCalendar(bySymbol, now, CONCLUSION_ACTION_DAYS);

  const facts: PortfolioFacts = portfolioFacts({
    symbols,
    stocks: [...stocks.values()].map((s) => ({ facts: s.facts, isSignal: s.isSignal })),
    unreadAlerts,
    actions: upcoming.map((e) => ({
      symbol: e.symbol,
      kind: e.item.kind,
      date: e.item.date,
      cashIdr: e.item.effect?.cashIdr ?? null,
    })),
    rulesTriggered: items.flatMap((item) =>
      item.rules
        .filter((r) => r.lastTriggeredAt && now.getTime() - r.lastTriggeredAt.getTime() < 4 * 86400_000)
        .map(() => item.symbol),
    ),
    actionDays: CONCLUSION_ACTION_DAYS,
  });

  return {
    items,
    holdings,
    holdingBySymbol,
    stocks,
    upcoming,
    notCovered: symbols.filter((s) => !stocks.has(s)).sort(),
    facts,
    bars,
  };
});
