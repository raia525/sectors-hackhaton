import {
  annualizedVolatility,
  clamp,
  correlation,
  linearSimilarity,
  ratioSimilarity,
} from "./stats";
import type { PeerProfile, ScoredPeer, SimilarityComponents } from "./types";

/**
 * Weights for the composite similarity score. They sum to 1 so the result is
 * directly interpretable as a 0-1 score.
 *
 * Correlation carries the largest share deliberately: the shadow's job is to
 * reproduce the target's *price behaviour*, and two companies can look alike on
 * paper while trading on entirely different flows. Fundamentals act as a
 * guard against spurious correlation rather than as the primary driver.
 */
export const SIMILARITY_WEIGHTS: Readonly<SimilarityComponents> = Object.freeze({
  correlation: 0.34,
  sector: 0.2,
  marketCap: 0.16,
  volatility: 0.14,
  growth: 0.1,
  dividend: 0.06,
});

/** Tolerances at which a linear similarity dimension decays to zero. */
const GROWTH_TOLERANCE = 0.5; // 50 percentage points of YoY growth
const DIVIDEND_TOLERANCE = 0.08; // 8 percentage points of yield

/**
 * Sector affinity: full credit for the same sub-sector, partial for the same
 * sector, none otherwise. Sub-sector is the meaningful unit on IDX, where
 * "Financials" spans both large banks and small multifinance companies.
 */
function sectorScore(target: PeerProfile, peer: PeerProfile): number {
  if (
    target.subSector &&
    peer.subSector &&
    target.subSector.toLowerCase() === peer.subSector.toLowerCase()
  ) {
    return 1;
  }
  if (
    target.sector &&
    peer.sector &&
    target.sector.toLowerCase() === peer.sector.toLowerCase()
  ) {
    return 0.55;
  }
  return 0;
}

/**
 * Volatility similarity. A twin that is far calmer or wilder than the target
 * will systematically under- or overshoot, so this is scored on the ratio of
 * annualised volatilities.
 */
function volatilityScore(targetReturns: number[], peerReturns: number[]): number {
  const tv = annualizedVolatility(targetReturns);
  const pv = annualizedVolatility(peerReturns);
  if (tv <= 0 || pv <= 0) return 0;
  return ratioSimilarity(tv, pv);
}

/**
 * Scores one candidate peer against the target across every dimension.
 *
 * `targetReturns` and `peerReturns` must already be date-aligned by the caller;
 * misaligned series would silently produce meaningless correlations.
 */
export function scorePeer(
  target: PeerProfile,
  targetReturns: number[],
  peer: PeerProfile,
  peerReturns: number[],
): ScoredPeer {
  const corr = correlation(targetReturns, peerReturns);

  const components: SimilarityComponents = {
    // Negative correlation is no basis for a twin, so the floor is 0.
    correlation: clamp(corr, 0, 1),
    sector: sectorScore(target, peer),
    marketCap: ratioSimilarity(target.marketCap, peer.marketCap),
    volatility: volatilityScore(targetReturns, peerReturns),
    growth:
      (linearSimilarity(target.revenueGrowth, peer.revenueGrowth, GROWTH_TOLERANCE) +
        linearSimilarity(
          target.earningsGrowth,
          peer.earningsGrowth,
          GROWTH_TOLERANCE,
        )) /
      2,
    dividend: linearSimilarity(
      target.dividendYieldTtm,
      peer.dividendYieldTtm,
      DIVIDEND_TOLERANCE,
    ),
  };

  let similarity = 0;
  for (const key of Object.keys(SIMILARITY_WEIGHTS) as (keyof SimilarityComponents)[]) {
    similarity += components[key] * SIMILARITY_WEIGHTS[key];
  }

  return {
    profile: peer,
    correlation: corr,
    similarity: clamp(similarity, 0, 1),
    components,
  };
}

/**
 * Ranks candidates and keeps the strongest, subject to a similarity floor.
 *
 * The floor matters: padding a thin shadow with weak peers produces a twin that
 * tracks nothing in particular while still looking authoritative on a chart.
 * Returning fewer constituents, and letting the caller warn about it, is the
 * honest outcome.
 */
export function selectPeers(
  scored: ScoredPeer[],
  { maxPeers = 8, minSimilarity = 0.35 }: { maxPeers?: number; minSimilarity?: number } = {},
): ScoredPeer[] {
  return scored
    .filter((p) => p.similarity >= minSimilarity && p.correlation > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxPeers);
}
