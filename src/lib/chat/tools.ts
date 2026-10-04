import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import { loadMarket, loadTrackRecord } from "@/lib/intelligence/market";
import { concludeMarket, concludeStock, concludeTrackRecord, type Conclusion } from "@/lib/intelligence/summary";
import { isSignal, type Bars } from "@/lib/intelligence/track-record";
import type { Message } from "@/lib/i18n/message";
import type { ToolSpec } from "./grok";

/**
 * The chatbot's tools. Each reads data the app has already stored (daily
 * run snapshots, the ticker directory, the asking user's own watchlist), so
 * a question never spends a Sectors credit. `get_watchlist` is scoped to the
 * user id the server took from the session, never one the model supplies.
 *
 * Results carry the conclusion and caveats already rendered in the user's
 * language, so the model repeats the app's own wording rather than
 * inventing its reading of the numbers.
 */

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "get_market_summary",
      description:
        "The latest daily run across all covered stocks: its date, the conclusion, the stocks moving most on their own, news and price disagreements, the sector view and coverage notes.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stock",
      description:
        "The latest stored analysis of one IDX stock: return split, divergence z score, twin fit, news check, positioning, upcoming corporate actions, the conclusion and its caveats.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string", description: "Four letter IDX code, for example BBRI." } },
        required: ["symbol"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tickers",
      description: "Finds IDX tickers by code or company name in the app's directory.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_watchlist",
      description:
        "The signed-in user's own watchlist: each stock's alert threshold, holding, latest stored signal, plus unread alerts and recent alerts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_track_record",
      description:
        "Whether past signals kept going in the days after, compared with ordinary days. Refuses a rate until there are enough resolved signals.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

export interface ToolContext {
  userId: string;
  bars: Bars;
  tm: (message: Message) => string;
  now: Date;
}

const conclusionText = (c: Conclusion, tm: ToolContext["tm"]) => ({
  tone: c.tone,
  headline: tm(c.headline),
  points: c.points.map((p) => tm(p)),
});

const messageSchema = z.object({ key: z.string(), params: z.record(z.unknown()).optional() });
const storedAnalysisSchema = z
  .object({
    realityCheck: z.object({ caveats: z.array(messageSchema).default([]) }).partial().optional(),
    shadow: z.object({ warnings: z.array(messageSchema).default([]), fitWindow: z.number() }).partial().optional(),
  })
  .passthrough();

const round = (v: number, d = 4) => Number(v.toFixed(d));

export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { error: "Arguments were not valid JSON." };
  }

  switch (name) {
    case "get_market_summary":
      return marketSummary(ctx);
    case "get_stock":
      return stock(String(args.symbol ?? ""), ctx);
    case "search_tickers":
      return searchTickers(String(args.query ?? ""));
    case "get_watchlist":
      return watchlist(ctx);
    case "get_track_record": {
      const record = await loadTrackRecord();
      return { ...record, conclusion: conclusionText(concludeTrackRecord(record), ctx.tm) };
    }
    default:
      return { error: `Unknown tool ${name}.` };
  }
}

async function marketSummary(ctx: ToolContext) {
  const market = await loadMarket();
  if (!market) return { found: false, note: "The daily run has not stored any analysis yet." };
  const { brief, facts } = market;
  const row = (r: (typeof brief.movers)[number]) => ({
    symbol: r.symbol,
    company: r.companyName,
    sector: r.sector,
    zScore: round(r.zScore, 2),
    totalReturn: round(r.totalReturn),
    stockSpecificReturn: round(r.idioReturn),
    twinFit: round(r.fitQuality, 2),
    newsCheck: r.realityVerdict,
  });
  return {
    found: true,
    runDate: facts.runDate,
    inProgress: facts.inProgress,
    covered: brief.covered,
    signals: brief.signalCount,
    conclusion: conclusionText(concludeMarket(brief, facts, ctx.bars), ctx.tm),
    movers: brief.movers.map(row),
    disagreements: brief.disagreements.map(row),
    smartMoney: brief.smartMoney.map((r) => ({ symbol: r.symbol, type: r.smartMoneyType, conviction: r.smartMoneyConviction })),
    sectors: brief.sectors.slice(0, 5).map((s) => ({ sector: s.sector, stocks: s.count, avgStockSpecific: round(s.avgIdio) })),
    leftOutForWeakTwin: brief.unreliable.map((r) => r.symbol),
    skipped: market.skipped,
    failed: market.failed,
  };
}

async function stock(raw: string, ctx: ToolContext) {
  const symbol = normalizeSymbol(raw);
  if (!symbol) return { found: false, note: "That is not a four letter IDX code." };
  const snap = await prisma.signalSnapshot.findFirst({ where: { symbol }, orderBy: { runDate: "desc" } });
  if (!snap) {
    return {
      found: false,
      symbol,
      note: "No stored analysis for this stock. The user can run one on its analysis page.",
      analyseUrl: `/stocks?symbol=${symbol}`,
    };
  }

  const holding = await prisma.holding.findUnique({ where: { userId_symbol: { userId: ctx.userId, symbol } } });
  const actions = summarizeCorporateActions(
    snap.corporateActions,
    holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
    ctx.now,
  );
  const upcoming = actions
    .filter((a) => a.timing === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));

  const stored = storedAnalysisSchema.safeParse(snap.analysis);
  const caveats = stored.success
    ? [...(stored.data.shadow?.warnings ?? []), ...(stored.data.realityCheck?.caveats ?? [])].map((m) =>
        ctx.tm(m as Message),
      )
    : [];

  const conclusion = concludeStock(
    {
      symbol,
      sessions: (stored.success ? stored.data.shadow?.fitWindow : undefined) ?? 0,
      zScore: snap.zScore,
      fitQuality: snap.fitQuality,
      peers: snap.constituentCount,
      total: snap.totalReturn,
      market: snap.marketReturn,
      sector: snap.sectorReturn,
      idio: snap.idioReturn,
      realityVerdict: snap.realityVerdict,
      upcoming: upcoming.map((a) => ({ kind: a.kind, date: a.date })),
    },
    ctx.bars,
  );

  return {
    found: true,
    symbol,
    company: snap.companyName,
    sector: snap.sector,
    runDate: snap.runDate,
    asOf: snap.asOf,
    isSignal: isSignal(snap, ctx.bars),
    zScore: round(snap.zScore, 2),
    twinFit: round(snap.fitQuality, 2),
    peers: snap.constituentCount,
    returns: {
      total: round(snap.totalReturn),
      market: round(snap.marketReturn),
      sector: round(snap.sectorReturn),
      stockSpecific: round(snap.idioReturn),
    },
    newsCheck: snap.realityVerdict,
    smartMoney: snap.smartMoneyType ? { type: snap.smartMoneyType, conviction: snap.smartMoneyConviction } : null,
    upcomingCorporateActions: upcoming.map((a) => ({ date: a.date, kind: a.kind, summary: ctx.tm(a.summary), cashIdr: a.effect?.cashIdr ?? null })),
    conclusion: conclusionText(conclusion, ctx.tm),
    caveats,
    analysisUrl: `/stocks?symbol=${symbol}`,
  };
}

async function searchTickers(query: string) {
  const q = query.trim().slice(0, 40);
  if (!q) return { results: [] };
  const rows = await prisma.companyDirectoryEntry.findMany({
    where: {
      OR: [
        { symbol: { startsWith: q.toUpperCase() } },
        { companyName: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { symbol: "asc" },
    take: 10,
    select: { symbol: true, companyName: true, sector: true },
  });
  return { results: rows };
}

async function watchlist(ctx: ToolContext) {
  const [items, holdings, unread, recent] = await Promise.all([
    prisma.watchlistItem.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" } }),
    prisma.holding.findMany({ where: { userId: ctx.userId } }),
    prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { symbol: true, title: true, createdAt: true },
    }),
  ]);
  const symbols = items.map((i) => i.symbol);
  const latest = await prisma.signalSnapshot.findMany({
    where: { symbol: { in: symbols } },
    orderBy: { runDate: "desc" },
    distinct: ["symbol"],
    select: { symbol: true, runDate: true, zScore: true, fitQuality: true, constituentCount: true },
  });
  const latestBy = new Map(latest.map((l) => [l.symbol, l]));
  const holdingBy = new Map(holdings.map((h) => [h.symbol, h]));

  return {
    stocks: items.map((i) => {
      const l = latestBy.get(i.symbol);
      const h = holdingBy.get(i.symbol);
      return {
        symbol: i.symbol,
        alertThresholdZ: i.zScoreThreshold,
        holding: h ? { lots: h.lots, avgPrice: h.avgPrice } : null,
        latest: l ? { runDate: l.runDate, zScore: round(l.zScore, 2), isSignal: isSignal(l, ctx.bars) } : null,
      };
    }),
    unreadAlerts: unread,
    recentAlerts: recent.map((r) => ({ symbol: r.symbol, title: r.title, date: r.createdAt.toISOString().slice(0, 10) })),
  };
}
