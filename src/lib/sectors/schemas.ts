import { z } from "zod";
import type { DailyBar, PeerProfile } from "@/lib/shadow/types";
import type { ForeignFlowPoint, OwnershipSnapshot } from "@/lib/smartmoney/types";

/**
 * Runtime validation for Sectors API responses.
 *
 * Third-party JSON is untrusted input. Parsing it through these schemas means
 * a shape change upstream surfaces as a clear validation error at the boundary
 * rather than as `undefined` propagating into a statistical model and quietly
 * producing a plausible-looking but wrong signal.
 *
 * Every numeric field is nullable: the API returns null for figures that do
 * not apply to a given company (banks have no inventory turnover, newly listed
 * firms have no growth history).
 */

const numeric = z.number().nullable().catch(null);

export const dailyBarSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  close: z.number(),
  open: numeric,
  high: numeric,
  low: numeric,
  volume: z.number().nullable().catch(null),
  market_cap: numeric,
});

export const dailyTransactionResponseSchema = z.array(dailyBarSchema);

/** Maps a validated API bar into the engine's own shape. */
export function toDailyBar(raw: z.infer<typeof dailyBarSchema>): DailyBar {
  return {
    date: raw.date,
    close: raw.close,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    volume: raw.volume ?? 0,
    marketCap: raw.market_cap ?? 0,
  };
}

/**
 * Parses a daily series, dropping unusable rows rather than failing the whole
 * request. A single malformed bar in ninety should not blank the chart.
 */
export function parseDailySeries(data: unknown): {
  bars: DailyBar[];
  dropped: number;
} {
  const parsed = dailyTransactionResponseSchema.safeParse(data);
  if (!parsed.success) {
    // Fall back to row-by-row salvage.
    if (!Array.isArray(data)) return { bars: [], dropped: 0 };
    const bars: DailyBar[] = [];
    let dropped = 0;
    for (const row of data) {
      const one = dailyBarSchema.safeParse(row);
      if (one.success && one.data.close > 0) bars.push(toDailyBar(one.data));
      else dropped += 1;
    }
    return { bars: sortByDate(bars), dropped };
  }

  const bars: DailyBar[] = [];
  let dropped = 0;
  for (const row of parsed.data) {
    if (row.close > 0) bars.push(toDailyBar(row));
    else dropped += 1;
  }
  return { bars: sortByDate(bars), dropped };
}

function sortByDate(bars: DailyBar[]): DailyBar[] {
  return bars.sort((a, b) => a.date.localeCompare(b.date));
}

const allTimePriceSchema = z.record(z.string(), z.unknown()).nullish();

export const companyReportSchema = z.object({
  symbol: z.string(),
  company_name: z.string().nullish(),
  overview: z
    .object({
      sector: z.string().nullish(),
      sub_sector: z.string().nullish(),
      industry: z.string().nullish(),
      sub_industry: z.string().nullish(),
      market_cap: numeric,
      market_cap_rank: numeric,
      last_close_price: numeric,
      latest_close_date: z.string().nullish(),
      daily_close_change: numeric,
      listing_date: z.string().nullish(),
      employee_num: numeric,
      esg_score: numeric,
      all_time_price: allTimePriceSchema,
      tags: z.array(z.string()).nullish(),
      indices: z.array(z.string()).nullish(),
    })
    .nullish(),
  valuation: z
    .object({
      forward_pe: numeric,
      intrinsic_value: numeric,
      historical_valuation: z
        .array(
          z.object({
            year: numeric,
            pe: numeric,
            pb: numeric,
            ps: numeric,
            pe_peer_avg: numeric,
            pb_peer_avg: numeric,
          }),
        )
        .nullish(),
    })
    .nullish(),
  financials: z
    .object({
      eps: numeric,
      yoy_quarter_revenue_growth: numeric,
      yoy_quarter_earnings_growth: numeric,
      historical_financials: z
        .array(
          z.object({
            year: numeric,
            revenue: numeric,
            earnings: numeric,
            total_assets: numeric,
            total_equity: numeric,
            total_liabilities: numeric,
            free_cash_flow: numeric,
          }),
        )
        .nullish(),
    })
    .nullish(),
  dividend: z
    .object({
      yield_ttm: numeric,
      dividend_ttm: numeric,
      payout_ratio: numeric,
      last_ex_dividend_date: z.string().nullish(),
    })
    .nullish(),
  peers: z.unknown().nullish(),
});

export type CompanyReport = z.infer<typeof companyReportSchema>;

/** Extracts the descriptors the similarity model needs from a company report. */
export function toPeerProfile(report: CompanyReport): PeerProfile {
  const o = report.overview;
  const v = report.valuation?.historical_valuation?.at(-1);
  return {
    symbol: report.symbol.replace(/\.JK$/i, "").toUpperCase(),
    companyName: report.company_name ?? report.symbol,
    sector: o?.sector ?? null,
    subSector: o?.sub_sector ?? null,
    marketCap: o?.market_cap ?? null,
    peTtm: v?.pe ?? report.valuation?.forward_pe ?? null,
    pbMrq: v?.pb ?? null,
    revenueGrowth: report.financials?.yoy_quarter_revenue_growth ?? null,
    earningsGrowth: report.financials?.yoy_quarter_earnings_growth ?? null,
    dividendYieldTtm: report.dividend?.yield_ttm ?? null,
  };
}

/**
 * Peer symbols embedded in a company report.
 *
 * The peers block is deeply nested and its exact shape varies, so this walks
 * defensively and returns whatever valid tickers it finds. Getting zero peers
 * is a handled case upstream, not an error.
 */
export function extractPeerSymbols(report: CompanyReport, exclude: string): string[] {
  const found = new Set<string>();
  const target = exclude.toUpperCase();

  const walk = (node: unknown, depth: number): void => {
    if (depth > 6 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const symbol = record.symbol;
    if (typeof symbol === "string") {
      const clean = symbol.replace(/\.JK$/i, "").toUpperCase();
      if (/^[A-Z]{4}$/.test(clean) && clean !== target) found.add(clean);
    }
    for (const value of Object.values(record)) walk(value, depth + 1);
  };

  walk(report.peers, 0);
  return [...found];
}

export const corporateActionsSchema = z.object({
  symbol: z.string(),
  corporate_actions: z.object({
    agm: z
      .array(
        z.object({
          agm_date: z.string().nullish(),
          agm_result: z.string().nullish(),
        }),
      )
      .nullish(),
    dividend: z
      .array(
        z.object({
          ex_date: z.string().nullish(),
          payment_date: z.string().nullish(),
          dividend_amount: numeric,
          dividend_yield: numeric,
        }),
      )
      .nullish(),
    stock_split: z
      .array(z.object({ date: z.string().nullish(), split_ratio: numeric }))
      .nullish(),
    right_issue: z.unknown().nullish(),
    bonus: z.unknown().nullish(),
    warrant: z.unknown().nullish(),
    upcoming_dividend: z.unknown().nullish(),
  }),
});

export const newsItemSchema = z.object({
  title: z.string(),
  body: z.string().nullish(),
  source: z.string().nullish(),
  timestamp: z.string(),
  sub_sector: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  symbols: z.array(z.string()).nullish(),
  dimension: z.record(z.string(), z.number()).nullish(),
});

export const newsResponseSchema = z.object({
  results: z.array(newsItemSchema),
  pagination: z.unknown().nullish(),
});

export type NewsItem = z.infer<typeof newsItemSchema>;

export const foreignFlowSchema = z.object({
  symbol: z.string(),
  data: z.array(
    z.object({
      date: z.string(),
      net_foreign_inflow: numeric,
      foreign_buy_idr: numeric,
      foreign_sell_idr: numeric,
      foreign_share: numeric,
    }),
  ),
});

/** Maps a foreign flow response, dropping days with no net figure. */
export function parseForeignFlow(data: unknown): ForeignFlowPoint[] {
  const parsed = foreignFlowSchema.safeParse(data);
  if (!parsed.success) return [];

  const out: ForeignFlowPoint[] = [];
  for (const row of parsed.data.data) {
    if (row.net_foreign_inflow === null) continue;
    out.push({
      date: row.date,
      netInflow: row.net_foreign_inflow,
      buyIdr: row.foreign_buy_idr,
      sellIdr: row.foreign_sell_idr,
      foreignShare: row.foreign_share,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const ownershipRowSchema = z
  .object({
    date: z.string(),
    shares_number: numeric,
    total_l: numeric,
    total_f: numeric,
    individual_l: numeric,
    individual_f: numeric,
    numbers_of_shareholders: numeric,
  })
  .passthrough();

export const shareholdersSchema = z.object({
  symbol: z.string(),
  year: z.number().nullish(),
  data: z.array(ownershipRowSchema),
});

/**
 * Maps shareholder composition into ownership snapshots.
 *
 * Institutional holdings are derived as total minus individual, rather than by
 * summing the named institutional categories. The API splits holdings across
 * nine categories per locality, and summing them would silently under-count
 * whenever the upstream adds a category we do not know about. Subtracting the
 * one category we want to exclude is stable against that.
 */
export function parseOwnership(data: unknown): OwnershipSnapshot[] {
  const parsed = shareholdersSchema.safeParse(data);
  if (!parsed.success) return [];

  const out: OwnershipSnapshot[] = [];
  for (const row of parsed.data.data) {
    const totalLocal = row.total_l ?? 0;
    const totalForeign = row.total_f ?? 0;
    const individualLocal = row.individual_l ?? 0;
    const individualForeign = row.individual_f ?? 0;

    out.push({
      date: row.date,
      sharesOutstanding: row.shares_number,
      institutionalLocal: Math.max(0, totalLocal - individualLocal),
      institutionalForeign: Math.max(0, totalForeign - individualForeign),
      individualLocal,
      individualForeign,
      numberOfShareholders: row.numbers_of_shareholders,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
