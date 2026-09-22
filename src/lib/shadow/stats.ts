/**
 * Pure statistical helpers for the shadow engine.
 *
 * Everything here is deterministic and allocation-light: the engine runs these
 * over a few hundred peers per request, so the hot paths avoid intermediate
 * arrays where a single pass will do.
 */

/** Natural log returns from a close series. Length is prices.length - 1. */
export function logReturns(prices: number[]): number[] {
  const out: number[] = new Array(Math.max(0, prices.length - 1));
  for (let i = 1; i < prices.length; i += 1) {
    const prev = prices[i - 1];
    const curr = prices[i];
    // Guard against zero/negative prints, which appear in thin IDX tickers.
    out[i - 1] = prev > 0 && curr > 0 ? Math.log(curr / prev) : 0;
  }
  return out;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < xs.length; i += 1) sum += xs[i];
  return sum / xs.length;
}

/** Sample standard deviation (n-1 denominator). */
export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let acc = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const d = xs[i] - m;
    acc += d * d;
  }
  return Math.sqrt(acc / (xs.length - 1));
}

/** Annualised volatility from daily returns, assuming 252 trading days. */
export function annualizedVolatility(dailyReturns: number[]): number {
  return stdDev(dailyReturns) * Math.sqrt(252);
}

/**
 * Pearson correlation. Returns 0 when either series is constant, which is the
 * correct neutral answer for a suspended or untraded ticker.
 */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : clamp(num / denom, -1, 1);
}

/**
 * Ordinary least squares slope of y on x (beta), with the intercept discarded.
 * Used to measure a stock's sensitivity to the market index.
 */
export function beta(y: number[], x: number[]): number {
  const n = Math.min(y.length, x.length);
  if (n < 2) return 0;
  const my = mean(y.slice(0, n));
  const mx = mean(x.slice(0, n));
  let cov = 0;
  let varx = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - mx;
    cov += (y[i] - my) * dx;
    varx += dx * dx;
  }
  return varx === 0 ? 0 : cov / varx;
}

/**
 * Coefficient of determination between an observed and a predicted series.
 * Clamped at 0 because a shadow that fits worse than the target's own mean is
 * simply "no explanatory power" rather than a meaningful negative number.
 */
export function rSquared(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n < 2) return 0;
  const m = mean(actual.slice(0, n));
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    const res = actual[i] - predicted[i];
    const tot = actual[i] - m;
    ssRes += res * res;
    ssTot += tot * tot;
  }
  return ssTot === 0 ? 0 : clamp(1 - ssRes / ssTot, 0, 1);
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Compounds a daily return series into a cumulative return path. */
export function cumulative(returns: number[]): number[] {
  const out: number[] = new Array(returns.length);
  let acc = 1;
  for (let i = 0; i < returns.length; i += 1) {
    acc *= 1 + returns[i];
    out[i] = acc - 1;
  }
  return out;
}

/**
 * Similarity on a ratio scale, for quantities where relative distance matters
 * more than absolute (market cap, valuation multiples). Two values an order of
 * magnitude apart score near 0; identical values score 1.
 */
export function ratioSimilarity(a: number | null, b: number | null): number {
  if (a == null || b == null || a <= 0 || b <= 0) return 0;
  const ratio = Math.log10(a / b);
  return clamp(1 - Math.abs(ratio), 0, 1);
}

/**
 * Similarity for signed quantities on a linear scale (growth rates, yields),
 * where `tolerance` is the gap at which similarity reaches zero.
 */
export function linearSimilarity(
  a: number | null,
  b: number | null,
  tolerance: number,
): number {
  if (a == null || b == null || tolerance <= 0) return 0;
  return clamp(1 - Math.abs(a - b) / tolerance, 0, 1);
}

/**
 * Converts a raw divergence into a z-score against its own trailing history.
 * Returns 0 when there is not enough history to be meaningful, so the UI never
 * shows a confident-looking score built on three data points.
 */
export function zScore(value: number, history: number[]): number {
  if (history.length < 20) return 0;
  const sd = stdDev(history);
  return sd === 0 ? 0 : (value - mean(history)) / sd;
}
