import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import { getSignalBars } from "@/lib/settings/server";
import { buildCalendar, type CalendarEntry } from "./calendar";
import { isSignal } from "./track-record";
import type { PortfolioFacts } from "./summary";

/**
 * A user's own stocks, read from the database once per request: the
 * watchlist, holdings, alerts, the calendar of upcoming corporate actions
 * and the latest stored analysis of each watched stock. No credit is spent;
 * a watched stock the daily run has not reached yet is counted, not fetched.
 */

export const loadPortfolio = cache(async (userId: string, now: Date = new Date()) => {
  const [items, holdings, unreadAlerts, bars] = await Promise.all([
    prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.holding.findMany({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    getSignalBars(),
  ]);
  const symbols = items.map((i) => i.symbol);

  const latest = symbols.length
    ? await prisma.signalSnapshot.findMany({
        where: { symbol: { in: symbols } },
        orderBy: { runDate: "desc" },
        distinct: ["symbol"],
        select: {
          symbol: true,
          runDate: true,
          zScore: true,
          fitQuality: true,
          constituentCount: true,
          corporateActions: true,
        },
      })
    : [];

  const holdingBySymbol = new Map(holdings.map((h) => [h.symbol, h]));
  const calendar: CalendarEntry[] = buildCalendar(
    latest.map((l) => {
      const holding = holdingBySymbol.get(l.symbol);
      return {
        symbol: l.symbol,
        items: summarizeCorporateActions(
          l.corporateActions,
          holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
          now,
        ),
      };
    }),
    now,
  );
  const covered = new Set(latest.map((l) => l.symbol));

  const facts: PortfolioFacts = {
    watched: symbols.length,
    signalling: latest.filter((l) => isSignal(l, bars)).map((l) => l.symbol),
    notCovered: symbols.filter((s) => !covered.has(s)).length,
    unreadAlerts,
    upcomingActions: calendar.length,
    upcomingIncome: calendar.reduce((sum, e) => sum + (e.item.effect?.cashIdr ?? 0), 0),
  };

  return {
    items,
    holdings,
    holdingBySymbol,
    calendar,
    notCovered: symbols.filter((s) => !covered.has(s)).sort(),
    latestBySymbol: new Map(latest.map((l) => [l.symbol, l])),
    facts,
  };
});
