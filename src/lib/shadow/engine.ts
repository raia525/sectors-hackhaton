import { scorePeer, selectPeers } from "./similarity";
import {
  beta,
  clamp,
  cumulative,
  logReturns,
  mean,
  rSquared,
  stdDev,
  zScore,
} from "./stats";
import type {
  DailyBar,
  DivergenceVerdict,
  PeerProfile,
  ReturnAttribution,
  ScoredPeer,
  ShadowAnalysis,
  ShadowConstituent,
  ShadowPoint,
} from "./types";

/** Minimum aligned observations before a twin is worth computing at all. */
const MIN_OBSERVATIONS = 30;

export interface ShadowInput {
  target: { profile: PeerProfile; bars: DailyBar[] };
  candidates: { profile: PeerProfile; bars: DailyBar[] }[];
  /** Index bars (IHSG) used for market attribution. */
  marketBars: DailyBar[];
  maxPeers?: number;
  minSimilarity?: number;
}

/**
 * Aligns several price series onto their common trading dates.
 *
 * IDX tickers suspend, list late, and go untraded, so raw series arrive with
 * ragged dates. Comparing them without aligning first is the single easiest way
 * to manufacture a correlation that does not exist.
 */
export function alignSeries(
  series: { key: string; bars: DailyBar[] }[],
): { dates: string[]; closes: Map<string, number[]> } {
  if (series.length === 0) return { dates: [], closes: new Map() };

  const indices = series.map((s) => {
    const m = new Map<string, number>();
    for (const bar of s.bars) {
      if (bar.close > 0) m.set(bar.date, bar.close);
    }
    return m;
  });

  // Intersect dates, driven by the smallest series to keep this near-linear.
  let smallest = 0;
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i].size < indices[smallest].size) smallest = i;
  }

  const dates: string[] = [];
  for (const date of indices[smallest].keys()) {
    if (indices.every((m) => m.has(date))) dates.push(date);
  }
  dates.sort();

  const closes = new Map<string, number[]>();
  series.forEach((s, i) => {
    const m = indices[i];
    closes.set(
      s.key,
      dates.map((d) => m.get(d) as number),
    );
  });

  return { dates, closes };
}

/**
 * Fits non-negative peer weights.
 *
 * We deliberately use similarity-proportional weights rather than an
 * unconstrained least-squares fit. OLS on correlated peers produces large
 * offsetting long/short weights that overfit the window and collapse out of
 * sample, which would make divergence look tiny right up until it looked
 * absurd. Convex weights keep the twin interpretable as a real portfolio and
 * degrade gracefully.
 *
 * A single scalar gain then rescales the twin so its volatility matches the
 * target, correcting the variance lost to diversification across peers.
 */
export function fitWeights(
  peers: ScoredPeer[],
  targetReturns: number[],
  peerReturns: Map<string, number[]>,
): { weights: Map<string, number>; gain: number } {
  const weights = new Map<string, number>();
  if (peers.length === 0) return { weights, gain: 1 };

  // Squaring sharpens the preference for genuinely close peers without letting
  // the single best peer dominate the way a winner-takes-all rule would.
  let total = 0;
  for (const p of peers) {
    const w = p.similarity * p.similarity;
    weights.set(p.profile.symbol, w);
    total += w;
  }

  if (total <= 0) {
    const equal = 1 / peers.length;
    for (const p of peers) weights.set(p.profile.symbol, equal);
  } else {
    for (const [symbol, w] of weights) weights.set(symbol, w / total);
  }

  const blended = blendReturns(weights, peerReturns, targetReturns.length);
  const targetSd = stdDev(targetReturns);
  const blendSd = stdDev(blended);
  // Cap the gain so an almost-flat twin cannot be inflated into a noisy one.
  const gain = blendSd > 0 && targetSd > 0 ? clamp(targetSd / blendSd, 0.5, 2.5) : 1;

  return { weights, gain };
}

/** Weighted sum of peer return series into a single shadow return series. */
function blendReturns(
  weights: Map<string, number>,
  peerReturns: Map<string, number[]>,
  length: number,
): number[] {
  const out = new Array<number>(length).fill(0);
  for (const [symbol, weight] of weights) {
    const series = peerReturns.get(symbol);
    if (!series) continue;
    const n = Math.min(length, series.length);
    for (let i = 0; i < n; i += 1) out[i] += series[i] * weight;
  }
  return out;
}

/**
 * Splits the target's realised return into market, sector, and stock-specific
 * parts. The three components sum exactly to the total return.
 *
 * Market is the target's beta-scaled share of the index move. Sector is what
 * the peer shadow explains beyond the market. Whatever remains is genuinely
 * specific to this company, and it is the number the product exists to surface.
 */
export function attributeReturn(
  targetReturns: number[],
  shadowReturns: number[],
  marketReturns: number[],
): ReturnAttribution {
  const total = targetReturns.reduce((a, b) => a + b, 0);
  const marketTotal = marketReturns.reduce((a, b) => a + b, 0);
  const shadowTotal = shadowReturns.reduce((a, b) => a + b, 0);

  const b = beta(targetReturns, marketReturns);
  const market = b * marketTotal;
  // The shadow already contains market exposure; subtract it so the components
  // do not double-count the index move.
  const sector = shadowTotal - market;

  return {
    total,
    market,
    sector,
    idiosyncratic: total - market - sector,
  };
}

/**
 * Maps a divergence z-score to a verdict.
 *
 * Thresholds are deliberately conservative. Under a normal approximation |z|>2
 * is roughly a 1-in-20 session, so calling that "extreme" would fire constantly
 * and train users to ignore it. Reserving the top label for |z|>3 keeps the
 * signal rare enough to be worth acting on.
 */
export function classifyDivergence(z: number): DivergenceVerdict {
  const a = Math.abs(z);
  if (a >= 3) return "extreme";
  if (a >= 2) return "significant";
  if (a >= 1) return "moderate";
  if (a >= 0.5) return "normal";
  return "aligned";
}

/**
 * Builds the full shadow analysis for one target.
 *
 * Returns a result with warnings rather than throwing on thin data: a partial,
 * clearly-labelled answer is more useful than an error page, and the warnings
 * are rendered next to the numbers so a weak twin cannot masquerade as a
 * strong one.
 */
export function buildShadow(input: ShadowInput): ShadowAnalysis {
  const { target, candidates, marketBars, maxPeers = 8, minSimilarity = 0.35 } = input;
  const warnings: string[] = [];

  const aligned = alignSeries([
    { key: "__target__", bars: target.bars },
    { key: "__market__", bars: marketBars },
    ...candidates.map((c) => ({ key: c.profile.symbol, bars: c.bars })),
  ]);

  const targetCloses = aligned.closes.get("__target__") ?? [];
  if (targetCloses.length < MIN_OBSERVATIONS) {
    return emptyAnalysis(
      target.profile,
      `Insufficient overlapping price history (${targetCloses.length} of ${MIN_OBSERVATIONS} sessions required).`,
    );
  }

  const targetReturns = logReturns(targetCloses);
  const marketReturns = logReturns(aligned.closes.get("__market__") ?? []);

  const peerReturns = new Map<string, number[]>();
  const scored: ScoredPeer[] = [];
  for (const candidate of candidates) {
    const closes = aligned.closes.get(candidate.profile.symbol);
    if (!closes || closes.length !== targetCloses.length) continue;
    const returns = logReturns(closes);
    peerReturns.set(candidate.profile.symbol, returns);
    scored.push(scorePeer(target.profile, targetReturns, candidate.profile, returns));
  }

  const selected = selectPeers(scored, { maxPeers, minSimilarity });
  if (selected.length === 0) {
    return emptyAnalysis(
      target.profile,
      "No peer cleared the similarity threshold, so no reliable twin could be built.",
    );
  }
  if (selected.length < 3) {
    warnings.push(
      `Twin built from only ${selected.length} peer${selected.length === 1 ? "" : "s"}; divergence is less reliable than usual.`,
    );
  }

  const { weights, gain } = fitWeights(selected, targetReturns, peerReturns);
  const shadowReturns = blendReturns(weights, peerReturns, targetReturns.length).map(
    (r) => r * gain,
  );

  const actualCum = cumulative(targetReturns);
  const shadowCum = cumulative(shadowReturns);
  const series: ShadowPoint[] = aligned.dates.slice(1).map((date, i) => ({
    date,
    actual: actualCum[i],
    shadow: shadowCum[i],
    divergence: actualCum[i] - shadowCum[i],
  }));

  const fitQuality = rSquared(targetReturns, shadowReturns);
  if (fitQuality < 0.3) {
    warnings.push(
      `Twin explains only ${(fitQuality * 100).toFixed(0)}% of price variation; treat the divergence as indicative, not conclusive.`,
    );
  }

  // Daily divergences, so the z-score measures "unusual for this stock" rather
  // than drift accumulated over the whole window.
  const dailyDivergence = targetReturns.map((r, i) => r - shadowReturns[i]);
  const latest = dailyDivergence.at(-1) ?? 0;
  const history = dailyDivergence.slice(0, -1);
  const z = zScore(latest, history);
  if (history.length < 20) {
    warnings.push("Fewer than 20 prior sessions; the z-score is reported as zero.");
  }

  return {
    symbol: target.profile.symbol,
    companyName: target.profile.companyName,
    asOf: aligned.dates.at(-1) ?? "",
    fitWindow: targetReturns.length,
    constituents: selected.map<ShadowConstituent>((p) => ({
      symbol: p.profile.symbol,
      companyName: p.profile.companyName,
      weight: weights.get(p.profile.symbol) ?? 0,
      similarity: p.similarity,
      correlation: p.correlation,
      components: p.components,
    })),
    series,
    latestDivergence: latest,
    zScore: z,
    verdict: classifyDivergence(z),
    attribution: attributeReturn(targetReturns, shadowReturns, marketReturns),
    fitQuality,
    warnings,
  };
}

function emptyAnalysis(profile: PeerProfile, reason: string): ShadowAnalysis {
  return {
    symbol: profile.symbol,
    companyName: profile.companyName,
    asOf: "",
    fitWindow: 0,
    constituents: [],
    series: [],
    latestDivergence: 0,
    zScore: 0,
    verdict: "aligned",
    attribution: { total: 0, market: 0, sector: 0, idiosyncratic: 0 },
    fitQuality: 0,
    warnings: [reason],
  };
}

/** Re-exported for callers that only need the average, e.g. summary cards. */
export { mean };
