import type { CompanyReport } from "@/lib/sectors/schemas";
import type { DailyBar } from "@/lib/shadow/types";
import { annualizedVolatility, logReturns } from "@/lib/shadow/stats";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Headline statistics for a company.
 *
 * Every figure here comes from report sections the analysis has already paid
 * for, or is derived from the price series it already holds, so this module
 * adds no credit cost.
 *
 * Values are nullable throughout rather than defaulted to zero. A missing
 * return on equity and a return on equity of zero mean entirely different
 * things about a company, and collapsing them would be a quiet lie.
 */

export interface KeyStat {
  labelKey: TranslationKey;
  value: number | null;
  /** How the UI should format the raw value. */
  format: "currency" | "percent" | "ratio" | "number" | "multiple";
  /** Short explanation, shown for figures a non-analyst may not know. */
  hintKey?: TranslationKey;
}

export interface KeyStatGroup {
  titleKey: TranslationKey;
  stats: KeyStat[];
}

export interface KeyStats {
  groups: KeyStatGroup[];
  /** Position within the 52 week range, 0-1, or null when unavailable. */
  rangePosition: number | null;
  low52: number | null;
  high52: number | null;
  lastClose: number | null;
}

/**
 * Pulls a dated low or high out of the all_time_price block.
 *
 * That block is shaped as `{ "52_w_low": { "2025-01-14": 3900 } }`, a single
 * entry object keyed by date, so the value has to be read positionally.
 */
function readDatedPrice(
  block: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const entry = block?.[key];
  if (entry == null || typeof entry !== "object") return null;

  const values = Object.values(entry as Record<string, unknown>);
  const first = values[0];
  return typeof first === "number" && Number.isFinite(first) ? first : null;
}

export function buildKeyStats(
  report: CompanyReport,
  bars: DailyBar[],
): KeyStats {
  const overview = report.overview;
  const financials = report.financials;
  const dividend = report.dividend;
  const valuation = report.valuation?.historical_valuation?.at(-1);

  const allTime = (overview?.all_time_price ?? null) as
    | Record<string, unknown>
    | null;

  const low52 = readDatedPrice(allTime, "52_w_low");
  const high52 = readDatedPrice(allTime, "52_w_high");
  const lastClose = overview?.last_close_price ?? bars.at(-1)?.close ?? null;

  // Where the current price sits between its yearly extremes. Near 1 means the
  // stock is at its highs, near 0 at its lows.
  let rangePosition: number | null = null;
  if (low52 !== null && high52 !== null && lastClose !== null && high52 > low52) {
    rangePosition = Math.min(Math.max((lastClose - low52) / (high52 - low52), 0), 1);
  }

  // Latest financial year, used for profitability ratios.
  const latestFinancials = financials?.historical_financials?.at(-1) ?? null;

  const roe =
    latestFinancials?.earnings != null &&
    latestFinancials?.total_equity != null &&
    latestFinancials.total_equity !== 0
      ? latestFinancials.earnings / latestFinancials.total_equity
      : null;

  const debtToEquity =
    latestFinancials?.total_liabilities != null &&
    latestFinancials?.total_equity != null &&
    latestFinancials.total_equity !== 0
      ? latestFinancials.total_liabilities / latestFinancials.total_equity
      : null;

  const netMargin =
    latestFinancials?.earnings != null &&
    latestFinancials?.revenue != null &&
    latestFinancials.revenue !== 0
      ? latestFinancials.earnings / latestFinancials.revenue
      : null;

  const volatility =
    bars.length > 2 ? annualizedVolatility(logReturns(bars.map((b) => b.close))) : null;

  // Banks are flagged so leverage can be described accurately; their deposits
  // sit in liabilities and make the ratio incomparable to other sectors.
  const isBank = /bank/i.test(
    `${overview?.sub_sector ?? ""} ${overview?.industry ?? ""} ${overview?.sub_industry ?? ""}`,
  );

  const groups: KeyStatGroup[] = [
    {
      titleKey: "keystats.groupMarket",
      stats: [
        { labelKey: "keystats.lastClose", value: lastClose, format: "currency" },
        {
          labelKey: "keystats.dailyChange",
          value: overview?.daily_close_change ?? null,
          format: "percent",
        },
        {
          labelKey: "keystats.marketCap",
          value: overview?.market_cap ?? null,
          format: "currency",
        },
        {
          labelKey: "keystats.volatility",
          value: volatility,
          format: "percent",
          hintKey: "keystats.volatilityHint",
        },
      ],
    },
    {
      titleKey: "keystats.groupValuation",
      stats: [
        {
          labelKey: "keystats.pe",
          value: valuation?.pe ?? report.valuation?.forward_pe ?? null,
          format: "multiple",
          hintKey: "keystats.peHint",
        },
        {
          labelKey: "keystats.pb",
          value: valuation?.pb ?? null,
          format: "multiple",
        },
        {
          labelKey: "keystats.peerPe",
          value: valuation?.pe_peer_avg ?? null,
          format: "multiple",
          hintKey: "keystats.peerPeHint",
        },
        {
          labelKey: "keystats.eps",
          value: financials?.eps ?? null,
          format: "currency",
        },
      ],
    },
    {
      titleKey: "keystats.groupPerformance",
      stats: [
        {
          labelKey: "keystats.revenueGrowth",
          value: financials?.yoy_quarter_revenue_growth ?? null,
          format: "percent",
          hintKey: "keystats.revenueGrowthHint",
        },
        {
          labelKey: "keystats.earningsGrowth",
          value: financials?.yoy_quarter_earnings_growth ?? null,
          format: "percent",
        },
        {
          labelKey: "keystats.roe",
          value: roe,
          format: "percent",
          hintKey: "keystats.roeHint",
        },
        { labelKey: "keystats.netMargin", value: netMargin, format: "percent" },
      ],
    },
    {
      titleKey: "keystats.groupIncome",
      stats: [
        {
          labelKey: "keystats.dividendYield",
          value: dividend?.yield_ttm ?? null,
          format: "percent",
          hintKey: "keystats.dividendYieldHint",
        },
        {
          labelKey: "keystats.payoutRatio",
          value: dividend?.payout_ratio ?? null,
          format: "percent",
          hintKey: "keystats.payoutRatioHint",
        },
        {
          labelKey: "keystats.debtToEquity",
          value: debtToEquity,
          format: "ratio",
          // Banks fund themselves with deposits, which land in liabilities, so
          // a ratio near 5 is ordinary for them and alarming for a manufacturer.
          // Without this note the figure invites the wrong conclusion.
          hintKey: isBank
            ? "keystats.debtToEquityBank"
            : "keystats.debtToEquityGeneral",
        },
        {
          labelKey: "keystats.employees",
          value: overview?.employee_num ?? null,
          format: "number",
        },
      ],
    },
  ];

  return { groups, rangePosition, low52, high52, lastClose };
}
