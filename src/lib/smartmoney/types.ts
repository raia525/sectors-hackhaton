/**
 * Smart money divergence: detecting when positioning and price disagree.
 *
 * A deliberate scoping note, because it governs every claim this module makes.
 *
 * The classic signal in the literature is *insider* cluster-buying: directors
 * and commissioners filing purchases of their own stock. The Sectors API does
 * not expose director-level transactions. The shareholders-composition endpoint
 * returns monthly snapshots by investor *category* (pension funds, insurance,
 * mutual funds, corporates), and foreign-flow returns daily net foreign value.
 *
 * So this module measures institutional and foreign positioning, and says so.
 * It never describes its output as insider activity, because that would be a
 * claim the underlying data cannot support.
 */

/** One day of net foreign flow for a symbol. */
export interface ForeignFlowPoint {
  date: string;
  netInflow: number;
  buyIdr: number | null;
  sellIdr: number | null;
  /** Foreign share of turnover, 0-1. */
  foreignShare: number | null;
}

/** End-of-month ownership snapshot, split local and foreign. */
export interface OwnershipSnapshot {
  date: string;
  sharesOutstanding: number | null;
  /** Shares held by categories treated as institutional money. */
  institutionalLocal: number;
  institutionalForeign: number;
  /** Retail, tracked separately: it is the crowd, not the smart money. */
  individualLocal: number;
  individualForeign: number;
  numberOfShareholders: number | null;
}

export type FlowDirection = "accumulating" | "distributing" | "neutral";

export type DivergenceType =
  | "bullish_divergence"
  | "bearish_divergence"
  | "confirmation_up"
  | "confirmation_down"
  | "no_signal";

export interface FlowSummary {
  direction: FlowDirection;
  /** Net flow over the window, in IDR. */
  netIdr: number;
  /** Net flow as a fraction of the stock's traded value over the window. */
  intensity: number;
  /** Consecutive sessions in the same direction, ending at the latest. */
  streak: number;
  /** Fraction of sessions in the window that were net positive, 0-1. */
  positiveSessionShare: number;
}

export interface OwnershipShift {
  direction: FlowDirection;
  /** Change in institutional ownership share, in percentage points. */
  shareChangePp: number;
  /** Months of snapshots the comparison spans. */
  months: number;
  /** Retail share change, for the crowding check. */
  retailShareChangePp: number;
}

export interface SmartMoneySignal {
  symbol: string;
  asOf: string;
  type: DivergenceType;
  /**
   * Conviction in [0,100]. This scores the *strength of the observed
   * disagreement*, not the probability of a future return.
   */
  conviction: number;
  priceReturn: number;
  foreignFlow: FlowSummary;
  ownership: OwnershipShift | null;
  /** Plain-language statements, each traceable to a figure above. */
  findings: string[];
  caveats: string[];
  /** True when inputs were too thin to score, forcing conviction to 0. */
  insufficientData: boolean;
}
