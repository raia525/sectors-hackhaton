import { z } from "zod";
import type { KeyStats } from "@/lib/analysis/key-stats";
import type { MarketFacts } from "@/lib/analysis/market-facts";
import type { Message } from "@/lib/i18n/message";

/**
 * Everything the app stored about one stock in its latest daily snapshot,
 * read back into plain typed facts for the watchlist, custom alert rules,
 * the watchlist conclusion and the chatbot.
 *
 * The JSON columns are parsed with Zod, so a snapshot from before a column
 * existed, or one with an unexpected shape, yields nulls ("not known yet")
 * rather than undefined values reaching a rule.
 */

const num = z.number().finite().nullable().catch(null);

const marketFactsSchema = z.object({
  asOf: z.string().nullable().catch(null),
  lastClose: num,
  prevClose: num,
  change1d: num,
  return5d: num,
  volume: num,
  avgVolume20: num,
  volumeRatio: num,
  dailyVolatility: num,
});

const keyStatsSchema = z.object({
  groups: z.array(
    z.object({
      titleKey: z.string(),
      stats: z.array(
        z.object({
          labelKey: z.string(),
          value: num,
          format: z.string(),
          hintKey: z.string().optional(),
        }),
      ),
    }),
  ),
  rangePosition: num,
  low52: num,
  high52: num,
  lastClose: num,
});

export interface StockStats {
  pe: number | null;
  pb: number | null;
  eps: number | null;
  /** Latest quarter, year on year, as fractions. */
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  roe: number | null;
  netMargin: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  rangePosition: number | null;
  low52: number | null;
  high52: number | null;
}

export interface WatchFacts {
  symbol: string;
  runDate: string;
  asOf: string;
  zScore: number;
  fitQuality: number;
  peers: number;
  total: number;
  market: number;
  sector: number;
  idio: number;
  realityVerdict: string;
  smartMoneyType: string | null;
  smartMoneyConviction: number | null;
  prices: MarketFacts | null;
  keyStats: KeyStats | null;
  stats: StockStats;
}

export interface SnapshotLike {
  symbol: string;
  runDate: string;
  asOf: string;
  zScore: number;
  fitQuality: number;
  constituentCount: number;
  totalReturn: number;
  marketReturn: number;
  sectorReturn: number;
  idioReturn: number;
  realityVerdict: string;
  smartMoneyType: string | null;
  smartMoneyConviction: number | null;
  keyStats: unknown;
  marketFacts: unknown;
}

const EMPTY_STATS: StockStats = {
  pe: null,
  pb: null,
  eps: null,
  revenueGrowth: null,
  earningsGrowth: null,
  roe: null,
  netMargin: null,
  dividendYield: null,
  debtToEquity: null,
  rangePosition: null,
  low52: null,
  high52: null,
};

const STAT_KEYS: Record<string, keyof StockStats> = {
  "keystats.pe": "pe",
  "keystats.pb": "pb",
  "keystats.eps": "eps",
  "keystats.revenueGrowth": "revenueGrowth",
  "keystats.earningsGrowth": "earningsGrowth",
  "keystats.roe": "roe",
  "keystats.netMargin": "netMargin",
  "keystats.dividendYield": "dividendYield",
  "keystats.debtToEquity": "debtToEquity",
};

export function readSnapshotFacts(s: SnapshotLike): WatchFacts {
  const prices = marketFactsSchema.safeParse(s.marketFacts);
  const stats = keyStatsSchema.safeParse(s.keyStats);

  const flat: StockStats = { ...EMPTY_STATS };
  if (stats.success) {
    for (const group of stats.data.groups) {
      for (const stat of group.stats) {
        const field = STAT_KEYS[stat.labelKey];
        if (field) flat[field] = stat.value;
      }
    }
    flat.rangePosition = stats.data.rangePosition;
    flat.low52 = stats.data.low52;
    flat.high52 = stats.data.high52;
  }

  return {
    symbol: s.symbol,
    runDate: s.runDate,
    asOf: s.asOf,
    zScore: s.zScore,
    fitQuality: s.fitQuality,
    peers: s.constituentCount,
    total: s.totalReturn,
    market: s.marketReturn,
    sector: s.sectorReturn,
    idio: s.idioReturn,
    realityVerdict: s.realityVerdict,
    smartMoneyType: s.smartMoneyType,
    smartMoneyConviction: s.smartMoneyConviction,
    prices: prices.success ? prices.data : null,
    keyStats: stats.success ? (stats.data as KeyStats) : null,
    stats: flat,
  };
}

const messageSchema = z.object({ key: z.string(), params: z.record(z.unknown()).optional() });
const storedAnalysisSchema = z
  .object({
    realityCheck: z.object({ caveats: z.array(messageSchema).default([]) }).partial().optional(),
    shadow: z.object({ warnings: z.array(messageSchema).default([]), fitWindow: z.number() }).partial().optional(),
  })
  .passthrough();

/**
 * The warnings and caveats stored with an analysis, as messages to render,
 * plus the window the twin was fitted over. Empty when the shape is
 * unexpected, so a reader never sees half-parsed text.
 */
export function readStoredAnalysis(analysis: unknown): { caveats: Message[]; fitWindow: number | null } {
  const parsed = storedAnalysisSchema.safeParse(analysis);
  if (!parsed.success) return { caveats: [], fitWindow: null };
  return {
    caveats: [...(parsed.data.shadow?.warnings ?? []), ...(parsed.data.realityCheck?.caveats ?? [])] as Message[],
    fitWindow: parsed.data.shadow?.fitWindow ?? null,
  };
}
