import { describe, expect, it } from "vitest";
import {
  alignSeries,
  attributeReturn,
  buildShadow,
  classifyDivergence,
  fitWeights,
} from "./engine";
import type { DailyBar, PeerProfile, ScoredPeer } from "./types";

/** Builds a synthetic price series from a daily return generator. */
function makeBars(
  start: number,
  days: number,
  fn: (i: number) => number,
  opts: { skip?: number[] } = {},
): DailyBar[] {
  const bars: DailyBar[] = [];
  let price = start;
  for (let i = 0; i < days; i += 1) {
    price *= 1 + fn(i);
    if (opts.skip?.includes(i)) continue;
    const date = new Date(Date.UTC(2025, 0, 6 + i)).toISOString().slice(0, 10);
    bars.push({
      date,
      close: Math.round(price),
      open: null,
      high: null,
      low: null,
      volume: 1_000_000,
      marketCap: Math.round(price) * 1_000_000,
    });
  }
  return bars;
}

function profile(symbol: string, over: Partial<PeerProfile> = {}): PeerProfile {
  return {
    symbol,
    companyName: `${symbol} Tbk`,
    sector: "Financials",
    subSector: "Banks",
    marketCap: 1_000_000_000_000,
    peTtm: 12,
    pbMrq: 2,
    revenueGrowth: 0.1,
    earningsGrowth: 0.12,
    dividendYieldTtm: 0.04,
    ...over,
  };
}

/** Deterministic pseudo-random generator so tests never flake. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
}

describe("alignSeries", () => {
  it("intersects dates so ragged series stay comparable", () => {
    const a = makeBars(100, 10, () => 0.01);
    const b = makeBars(100, 10, () => 0.01, { skip: [3, 4] });
    const { dates, closes } = alignSeries([
      { key: "a", bars: a },
      { key: "b", bars: b },
    ]);
    expect(dates).toHaveLength(8);
    expect(closes.get("a")).toHaveLength(8);
    expect(closes.get("b")).toHaveLength(8);
  });

  it("returns ascending dates regardless of input order", () => {
    const bars = makeBars(100, 5, () => 0.01).reverse();
    const { dates } = alignSeries([{ key: "a", bars }]);
    expect([...dates].sort()).toEqual(dates);
  });

  it("drops non-positive closes instead of aligning on them", () => {
    const bars = makeBars(100, 5, () => 0.01);
    bars[2].close = 0;
    const { dates } = alignSeries([{ key: "a", bars }]);
    expect(dates).toHaveLength(4);
  });

  it("handles empty input", () => {
    expect(alignSeries([]).dates).toEqual([]);
  });
});

describe("fitWeights", () => {
  it("produces non-negative weights summing to 1", () => {
    const peers: ScoredPeer[] = ["AAAA", "BBBB", "CCCC"].map((s, i) => ({
      profile: profile(s),
      correlation: 0.8,
      similarity: 0.9 - i * 0.2,
      components: {
        sector: 1,
        marketCap: 1,
        volatility: 1,
        correlation: 0.8,
        growth: 1,
        dividend: 1,
      },
    }));
    const returns = new Map(peers.map((p) => [p.profile.symbol, [0.01, -0.01, 0.02]]));
    const { weights } = fitWeights(peers, [0.01, -0.01, 0.02], returns);

    const total = [...weights.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
    expect([...weights.values()].every((w) => w >= 0)).toBe(true);
  });

  it("gives the most similar peer the largest weight", () => {
    const peers: ScoredPeer[] = [
      { symbol: "LOWW", sim: 0.4 },
      { symbol: "HIGH", sim: 0.95 },
    ].map(({ symbol, sim }) => ({
      profile: profile(symbol),
      correlation: 0.7,
      similarity: sim,
      components: {
        sector: 1,
        marketCap: 1,
        volatility: 1,
        correlation: 0.7,
        growth: 1,
        dividend: 1,
      },
    }));
    const returns = new Map(peers.map((p) => [p.profile.symbol, [0.01, 0.02]]));
    const { weights } = fitWeights(peers, [0.01, 0.02], returns);
    expect(weights.get("HIGH")!).toBeGreaterThan(weights.get("LOWW")!);
  });

  it("returns an empty fit when there are no peers", () => {
    const { weights, gain } = fitWeights([], [0.01], new Map());
    expect(weights.size).toBe(0);
    expect(gain).toBe(1);
  });
});

describe("attributeReturn", () => {
  it("decomposes total return into components that sum back exactly", () => {
    const target = [0.02, -0.01, 0.03];
    const shadow = [0.015, -0.005, 0.02];
    const market = [0.01, -0.005, 0.015];
    const a = attributeReturn(target, shadow, market);
    expect(a.market + a.sector + a.idiosyncratic).toBeCloseTo(a.total, 10);
  });

  it("attributes a pure market move to the market component", () => {
    // Stock moves exactly with the index and the shadow does too, so nothing
    // should be left over as stock-specific.
    const market = [0.01, 0.02, -0.015, 0.005];
    const a = attributeReturn(market, market, market);
    expect(a.idiosyncratic).toBeCloseTo(0, 10);
    expect(a.market).toBeCloseTo(a.total, 10);
  });
});

describe("classifyDivergence", () => {
  it("reserves the top label for genuinely rare moves", () => {
    expect(classifyDivergence(3.5)).toBe("extreme");
    expect(classifyDivergence(-3.5)).toBe("extreme");
    expect(classifyDivergence(2.4)).toBe("significant");
    expect(classifyDivergence(1.2)).toBe("moderate");
    expect(classifyDivergence(0.7)).toBe("normal");
    expect(classifyDivergence(0.1)).toBe("aligned");
  });

  it("is symmetric in sign", () => {
    for (const z of [0.2, 0.8, 1.5, 2.5, 4]) {
      expect(classifyDivergence(z)).toBe(classifyDivergence(-z));
    }
  });
});

describe("buildShadow", () => {
  const market = makeBars(7000, 80, (i) => (i % 3 === 0 ? 0.004 : -0.002));

  it("refuses to build a twin from insufficient history", () => {
    const result = buildShadow({
      target: { profile: profile("BBRI"), bars: makeBars(4000, 10, () => 0.01) },
      candidates: [
        { profile: profile("BMRI"), bars: makeBars(5000, 10, () => 0.01) },
      ],
      marketBars: market,
    });
    expect(result.constituents).toHaveLength(0);
    expect(result.warnings[0].key).toBe("shadow.warning.insufficientHistory");
  });

  it("builds a twin from correlated peers and reports a strong fit", () => {
    const rand = seeded(42);
    const base = (i: number) => (i % 4 === 0 ? 0.012 : -0.005) + rand() * 0.002;
    const target = makeBars(4000, 80, base);
    const candidates = ["BMRI", "BBNI", "BBCA", "BRIS"].map((s) => ({
      profile: profile(s),
      bars: makeBars(5000, 80, (i) => base(i) + seeded(s.length * 7)() * 0.001),
    }));

    const result = buildShadow({ target: { profile: profile("BBRI"), bars: target }, candidates, marketBars: market });

    expect(result.constituents.length).toBeGreaterThan(0);
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.fitQuality).toBeGreaterThan(0);
    expect(result.symbol).toBe("BBRI");
    const totalWeight = result.constituents.reduce((a, c) => a + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 6);
  });

  it("warns instead of silently reporting a weak twin as reliable", () => {
    const rand = seeded(7);
    const target = makeBars(4000, 80, () => rand() * 0.04);
    const other = seeded(999);
    const candidates = [
      {
        profile: profile("ZZZZ", { sector: "Energy", subSector: "Oil & Gas" }),
        bars: makeBars(3000, 80, () => other() * 0.04),
      },
    ];

    const result = buildShadow({
      target: { profile: profile("BBRI"), bars: target },
      candidates,
      marketBars: market,
    });

    // Either no peer qualifies, or the fit is flagged as unreliable. Both are
    // acceptable; silently presenting it as trustworthy is not.
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns a warning when no peer clears the similarity floor", () => {
    const result = buildShadow({
      target: { profile: profile("BBRI"), bars: makeBars(4000, 80, () => 0.01) },
      candidates: [],
      marketBars: market,
    });
    expect(result.constituents).toHaveLength(0);
    expect(
      result.warnings.some((w) =>
        ["shadow.warning.noPeerQualified", "shadow.warning.insufficientHistory"].includes(
          w.key,
        ),
      ),
    ).toBe(true);
  });

  it("keeps attribution additive on real-shaped data", () => {
    const rand = seeded(11);
    const base = (i: number) => (i % 5 === 0 ? 0.01 : -0.003) + rand() * 0.003;
    const result = buildShadow({
      target: { profile: profile("BBRI"), bars: makeBars(4000, 80, base) },
      candidates: ["BMRI", "BBNI", "BBCA"].map((s) => ({
        profile: profile(s),
        bars: makeBars(5000, 80, (i) => base(i) + seeded(s.length)() * 0.001),
      })),
      marketBars: market,
    });
    const a = result.attribution;
    expect(a.market + a.sector + a.idiosyncratic).toBeCloseTo(a.total, 8);
  });
});
