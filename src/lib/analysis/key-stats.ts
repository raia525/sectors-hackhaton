import type { CompanyReport } from "@/lib/sectors/schemas";
import type { DailyBar } from "@/lib/shadow/types";
import { annualizedVolatility, logReturns } from "@/lib/shadow/stats";

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
  label: string;
  value: number | null;
  /** How the UI should format the raw value. */
  format: "currency" | "percent" | "ratio" | "number" | "multiple";
  /** Short explanation, shown for figures a non-analyst may not know. */
  hint?: string;
}

export interface KeyStatGroup {
  title: string;
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
      title: "Market",
      stats: [
        { label: "Last close", value: lastClose, format: "currency" },
        {
          label: "Daily change",
          value: overview?.daily_close_change ?? null,
          format: "percent",
        },
        {
          label: "Market cap",
          value: overview?.market_cap ?? null,
          format: "currency",
        },
        {
          label: "Annualised volatility",
          value: volatility,
          format: "percent",
          hint: "Spread of daily returns over the window, scaled to a year.",
        },
      ],
    },
    {
      title: "Valuation",
      stats: [
        {
          label: "Price to earnings",
          value: valuation?.pe ?? report.valuation?.forward_pe ?? null,
          format: "multiple",
          hint: "Price relative to annual profit per share.",
        },
        {
          label: "Price to book",
          value: valuation?.pb ?? null,
          format: "multiple",
        },
        {
          label: "Peer average PE",
          value: valuation?.pe_peer_avg ?? null,
          format: "multiple",
          hint: "What comparable companies trade at, for context.",
        },
        {
          label: "Earnings per share",
          value: financials?.eps ?? null,
          format: "currency",
        },
      ],
    },
    {
      title: "Performance",
      stats: [
        {
          label: "Revenue growth",
          value: financials?.yoy_quarter_revenue_growth ?? null,
          format: "percent",
          hint: "Latest quarter against the same quarter a year earlier.",
        },
        {
          label: "Earnings growth",
          value: financials?.yoy_quarter_earnings_growth ?? null,
          format: "percent",
        },
        {
          label: "Return on equity",
          value: roe,
          format: "percent",
          hint: "Profit generated per rupiah of shareholder capital.",
        },
        { label: "Net margin", value: netMargin, format: "percent" },
      ],
    },
    {
      title: "Income and leverage",
      stats: [
        {
          label: "Dividend yield",
          value: dividend?.yield_ttm ?? null,
          format: "percent",
          hint: "Dividends over the last twelve months against the price.",
        },
        {
          label: "Payout ratio",
          value: dividend?.payout_ratio ?? null,
          format: "percent",
          hint: "Share of profit paid out. Above 100% is paid from reserves.",
        },
        {
          label: "Debt to equity",
          value: debtToEquity,
          format: "ratio",
          // Banks fund themselves with deposits, which land in liabilities, so
          // a ratio near 5 is ordinary for them and alarming for a manufacturer.
          // Without this note the figure invites the wrong conclusion.
          hint: isBank
            ? "Customer deposits count as liabilities, so this runs high for banks by nature."
            : "Liabilities against shareholder capital.",
        },
        {
          label: "Employees",
          value: overview?.employee_num ?? null,
          format: "number",
        },
      ],
    },
  ];

  return { groups, rangePosition, low52, high52, lastClose };
}
