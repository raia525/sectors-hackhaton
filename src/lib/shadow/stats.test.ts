import { describe, expect, it } from "vitest";
import {
  annualizedVolatility,
  beta,
  correlation,
  cumulative,
  linearSimilarity,
  logReturns,
  ratioSimilarity,
  rSquared,
  stdDev,
  zScore,
} from "./stats";

describe("logReturns", () => {
  it("computes log returns and drops one observation", () => {
    const r = logReturns([100, 110, 121]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(Math.log(1.1), 10);
    expect(r[1]).toBeCloseTo(Math.log(1.1), 10);
  });

  it("returns empty for a series too short to difference", () => {
    expect(logReturns([100])).toEqual([]);
    expect(logReturns([])).toEqual([]);
  });

  it("yields zero rather than NaN on non-positive prints", () => {
    // Suspended IDX tickers can report a zero close; NaN here would poison
    // every downstream correlation.
    const r = logReturns([100, 0, 50]);
    expect(r.every(Number.isFinite)).toBe(true);
    expect(r[0]).toBe(0);
  });
});

describe("correlation", () => {
  it("returns 1 for identical series", () => {
    expect(correlation([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
  });

  it("returns -1 for perfectly inverted series", () => {
    expect(correlation([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
  });

  it("returns 0 when a series is constant", () => {
    expect(correlation([1, 2, 3], [5, 5, 5])).toBe(0);
  });

  it("returns 0 when there is not enough data", () => {
    expect(correlation([1], [1])).toBe(0);
  });

  it("is invariant to positive affine rescaling", () => {
    const a = [1, 3, 2, 5, 4];
    const b = a.map((x) => x * 7 + 13);
    expect(correlation(a, b)).toBeCloseTo(1, 10);
  });
});

describe("beta", () => {
  it("recovers a known slope", () => {
    const market = [0.01, -0.02, 0.03, -0.01];
    const stock = market.map((m) => m * 1.5);
    expect(beta(stock, market)).toBeCloseTo(1.5, 10);
  });

  it("returns 0 when the market series has no variance", () => {
    expect(beta([1, 2, 3], [2, 2, 2])).toBe(0);
  });
});

describe("rSquared", () => {
  it("is 1 for a perfect prediction", () => {
    expect(rSquared([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it("clamps a worse-than-mean prediction to 0", () => {
    expect(rSquared([1, 2, 3], [100, -100, 50])).toBe(0);
  });
});

describe("similarity helpers", () => {
  it("scores identical magnitudes as 1", () => {
    expect(ratioSimilarity(1000, 1000)).toBe(1);
  });

  it("decays to 0 at one order of magnitude", () => {
    expect(ratioSimilarity(100, 1000)).toBeCloseTo(0, 10);
  });

  it("treats missing or non-positive inputs as no evidence", () => {
    expect(ratioSimilarity(null, 100)).toBe(0);
    expect(ratioSimilarity(0, 100)).toBe(0);
  });

  it("scores linear similarity within tolerance", () => {
    expect(linearSimilarity(0.1, 0.1, 0.5)).toBe(1);
    expect(linearSimilarity(0.1, 0.6, 0.5)).toBeCloseTo(0, 10);
    expect(linearSimilarity(0.1, 2, 0.5)).toBe(0);
  });
});

describe("volatility and dispersion", () => {
  it("annualises daily volatility by sqrt(252)", () => {
    const daily = [0.01, -0.01, 0.02, -0.02, 0.015];
    expect(annualizedVolatility(daily)).toBeCloseTo(stdDev(daily) * Math.sqrt(252), 10);
  });

  it("reports zero dispersion for a single observation", () => {
    expect(stdDev([0.5])).toBe(0);
  });
});

describe("cumulative", () => {
  it("compounds rather than sums", () => {
    const c = cumulative([0.1, 0.1]);
    expect(c[1]).toBeCloseTo(0.21, 10);
  });
});

describe("zScore", () => {
  it("returns 0 below the minimum history length", () => {
    // Guards against a confident-looking score built on a handful of points.
    expect(zScore(5, new Array(19).fill(0).map((_, i) => i * 0.001))).toBe(0);
  });

  it("measures deviation in standard deviations from the mean", () => {
    const history = new Array(40).fill(0).map((_, i) => (i % 2 === 0 ? 0.01 : -0.01));
    const sd = stdDev(history);
    // History is symmetric about zero, so a value of 2*sd sits exactly 2
    // standard deviations above the mean.
    expect(zScore(2 * sd, history)).toBeCloseTo(2, 6);
    expect(zScore(-2 * sd, history)).toBeCloseTo(-2, 6);
  });

  it("returns 0 when history has no variance", () => {
    expect(zScore(1, new Array(30).fill(0.5))).toBe(0);
  });
});
