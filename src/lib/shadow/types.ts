import type { Message } from "@/lib/i18n/message";

/**
 * Domain types for the synthetic twin ("shadow") engine.
 *
 * A shadow is a virtual portfolio of peer stocks, weighted so that its
 * historical return series tracks the target as closely as possible over a
 * fitting window. Divergence between the target's realised return and its
 * shadow's return is the idiosyncratic signal: the part of a move that the
 * market, the sector, and comparable companies do not explain.
 */

/** One trading day of OHLCV data as returned by the daily transaction endpoint. */
export interface DailyBar {
  date: string;
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  marketCap: number;
}

/** Fundamental descriptors used to score peer similarity. */
export interface PeerProfile {
  symbol: string;
  companyName: string;
  subSector: string | null;
  sector: string | null;
  marketCap: number | null;
  peTtm: number | null;
  pbMrq: number | null;
  /** Year-over-year quarterly revenue growth, as a fraction (0.12 = 12%). */
  revenueGrowth: number | null;
  /** Year-over-year quarterly earnings growth, as a fraction. */
  earningsGrowth: number | null;
  dividendYieldTtm: number | null;
}

/** A candidate peer scored against the target, before weight fitting. */
export interface ScoredPeer {
  profile: PeerProfile;
  /** Pearson correlation of daily log returns against the target. */
  correlation: number;
  /** Composite similarity in [0,1] blending fundamentals and correlation. */
  similarity: number;
  /** Per-dimension breakdown, surfaced in the UI so the score is auditable. */
  components: SimilarityComponents;
}

export interface SimilarityComponents {
  sector: number;
  marketCap: number;
  volatility: number;
  correlation: number;
  growth: number;
  dividend: number;
}

/** A peer admitted into the shadow, with its fitted portfolio weight. */
export interface ShadowConstituent {
  symbol: string;
  companyName: string;
  weight: number;
  similarity: number;
  correlation: number;
  components: SimilarityComponents;
}

/**
 * Attribution of a target's return into market, sector, and stock-specific
 * components. These three sum to the total return by construction.
 */
export interface ReturnAttribution {
  total: number;
  market: number;
  sector: number;
  idiosyncratic: number;
}

export interface ShadowPoint {
  date: string;
  /** Cumulative return of the target since the window start. */
  actual: number;
  /** Cumulative return of the fitted shadow since the window start. */
  shadow: number;
  /** actual - shadow. */
  divergence: number;
}

export type DivergenceVerdict =
  | "extreme"
  | "significant"
  | "moderate"
  | "normal"
  | "aligned";

export interface ShadowAnalysis {
  symbol: string;
  companyName: string;
  asOf: string;
  /** Trading days used to fit the shadow. */
  fitWindow: number;
  constituents: ShadowConstituent[];
  series: ShadowPoint[];
  /** Divergence over the most recent session. */
  latestDivergence: number;
  /** Divergence expressed in standard deviations of its own history. */
  zScore: number;
  verdict: DivergenceVerdict;
  attribution: ReturnAttribution;
  /**
   * Goodness of fit (R^2) of the shadow against the target over the fit
   * window. Low values mean the twin is unreliable and the UI must say so.
   */
  fitQuality: number;
  /** Non-fatal problems encountered while building the shadow. */
  warnings: Message[];
}
