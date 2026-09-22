import { describe, expect, it } from "vitest";
import {
  companyReportSchema,
  extractPeerSymbols,
  newsResponseSchema,
  parseDailySeries,
  parseForeignFlow,
  parseIndexSeries,
  parseOwnership,
  toPeerProfile,
} from "./schemas";

/**
 * These tests exist because this module is the boundary between untrusted
 * third-party JSON and the statistical engines. A shape change upstream must
 * surface as a named failure or a dropped row, never as an `undefined` that
 * reaches a model and produces a confident but wrong number.
 */

describe("parseDailySeries", () => {
  const bar = (over: Record<string, unknown> = {}) => ({
    symbol: "BBCA.JK",
    date: "2025-05-02",
    close: 8975,
    open: 9000,
    high: 9000,
    low: 8850,
    volume: 92_219_000,
    market_cap: 1_095_329_638_012_500,
    ...over,
  });

  it("maps API fields onto the engine's shape", () => {
    const { bars } = parseDailySeries([bar()]);
    expect(bars[0]).toEqual({
      date: "2025-05-02",
      close: 8975,
      open: 9000,
      high: 9000,
      low: 8850,
      volume: 92_219_000,
      marketCap: 1_095_329_638_012_500,
    });
  });

  it("sorts bars by date regardless of the order received", () => {
    const { bars } = parseDailySeries([
      bar({ date: "2025-05-05" }),
      bar({ date: "2025-05-01" }),
      bar({ date: "2025-05-03" }),
    ]);
    expect(bars.map((b) => b.date)).toEqual([
      "2025-05-01",
      "2025-05-03",
      "2025-05-05",
    ]);
  });

  it("drops non-positive closes and reports the count", () => {
    // A zero close from a suspended ticker would produce a nonsense return.
    const { bars, dropped } = parseDailySeries([bar(), bar({ date: "2025-05-03", close: 0 })]);
    expect(bars).toHaveLength(1);
    expect(dropped).toBe(1);
  });

  it("salvages good rows when one row is malformed", () => {
    // One bad bar in ninety must not blank the entire chart.
    const { bars, dropped } = parseDailySeries([
      bar(),
      { nonsense: true },
      bar({ date: "2025-05-06" }),
    ]);
    expect(bars).toHaveLength(2);
    expect(dropped).toBe(1);
  });

  it("tolerates null optional fields", () => {
    const { bars } = parseDailySeries([
      bar({ open: null, high: null, low: null, volume: null, market_cap: null }),
    ]);
    expect(bars[0].volume).toBe(0);
    expect(bars[0].marketCap).toBe(0);
    expect(bars[0].open).toBeNull();
  });

  it("returns empty for a non-array payload", () => {
    expect(parseDailySeries({ error: "nope" }).bars).toEqual([]);
    expect(parseDailySeries(null).bars).toEqual([]);
  });
});

describe("toPeerProfile", () => {
  it("extracts the descriptors the similarity model needs", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI.JK",
      company_name: "Bank Rakyat Indonesia Tbk",
      overview: {
        sector: "Financials",
        sub_sector: "Banks",
        market_cap: 700_000_000_000_000,
      },
      financials: {
        yoy_quarter_revenue_growth: 0.08,
        yoy_quarter_earnings_growth: 0.12,
      },
      dividend: { yield_ttm: 0.062 },
      valuation: {
        historical_valuation: [{ year: 2024, pe: 11.2, pb: 2.4 }],
      },
    });

    const profile = toPeerProfile(report);
    expect(profile.symbol).toBe("BBRI");
    expect(profile.subSector).toBe("Banks");
    expect(profile.marketCap).toBe(700_000_000_000_000);
    expect(profile.peTtm).toBe(11.2);
    expect(profile.revenueGrowth).toBe(0.08);
    expect(profile.dividendYieldTtm).toBe(0.062);
  });

  it("strips the .JK suffix from the symbol", () => {
    const report = companyReportSchema.parse({ symbol: "TLKM.JK" });
    expect(toPeerProfile(report).symbol).toBe("TLKM");
  });

  it("yields nulls rather than throwing when sections are absent", () => {
    // Callers request only the sections they need, so most will be missing.
    const profile = toPeerProfile(companyReportSchema.parse({ symbol: "GOTO" }));
    expect(profile.marketCap).toBeNull();
    expect(profile.revenueGrowth).toBeNull();
    expect(profile.companyName).toBe("GOTO");
  });

  it("falls back to forward PE when no historical valuation exists", () => {
    const report = companyReportSchema.parse({
      symbol: "BBCA",
      valuation: { forward_pe: 18.5 },
    });
    expect(toPeerProfile(report).peTtm).toBe(18.5);
  });

  it("coerces an unexpected field type to null rather than failing", () => {
    const report = companyReportSchema.parse({
      symbol: "BBCA",
      overview: { market_cap: "not a number" },
    });
    expect(toPeerProfile(report).marketCap).toBeNull();
  });
});

describe("extractPeerSymbols", () => {
  it("finds peer tickers in the nested peers block", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      peers: [
        {
          peers_data: {
            companies: [
              { symbol: "BMRI.JK", company_name: "Bank Mandiri" },
              { symbol: "BBNI.JK", company_name: "BNI" },
            ],
          },
        },
      ],
    });

    const peers = extractPeerSymbols(report, "BBRI");
    expect(peers).toContain("BMRI");
    expect(peers).toContain("BBNI");
  });

  it("excludes the target itself", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      peers: [{ peers_data: { companies: [{ symbol: "BBRI.JK" }, { symbol: "BMRI" }] } }],
    });
    expect(extractPeerSymbols(report, "BBRI")).toEqual(["BMRI"]);
  });

  it("de-duplicates repeated symbols", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      peers: [
        { peers_data: { companies: [{ symbol: "BMRI" }] } },
        { peers_data: { companies: [{ symbol: "BMRI" }] } },
      ],
    });
    expect(extractPeerSymbols(report, "BBRI")).toEqual(["BMRI"]);
  });

  it("ignores values that cannot be IDX tickers", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      peers: [{ peers_data: { companies: [{ symbol: "TOOLONG" }, { symbol: "AB" }] } }],
    });
    expect(extractPeerSymbols(report, "BBRI")).toEqual([]);
  });

  it("returns an empty list when the peers block is absent", () => {
    const report = companyReportSchema.parse({ symbol: "BBRI" });
    expect(extractPeerSymbols(report, "BBRI")).toEqual([]);
  });

  it("does not recurse without bound on a deeply nested payload", () => {
    // Guards against a pathological payload turning a parse into a hang.
    let nested: Record<string, unknown> = { symbol: "DEEP" };
    for (let i = 0; i < 50; i += 1) nested = { child: nested };

    const report = companyReportSchema.parse({ symbol: "BBRI", peers: nested });
    expect(() => extractPeerSymbols(report, "BBRI")).not.toThrow();
  });
});

describe("newsResponseSchema", () => {
  it("parses a news payload with its dimension scores", () => {
    const parsed = newsResponseSchema.parse({
      results: [
        {
          title: "Laba BBRI naik",
          body: "Isi berita",
          source: "https://example.com",
          timestamp: "2025-06-30T00:00:00Z",
          sub_sector: ["banks"],
          tags: ["dividend"],
          symbols: ["BBRI"],
          dimension: { financials: 1, valuation: 0.5 },
        },
      ],
      pagination: { total_count: 1 },
    });

    expect(parsed.results[0].title).toBe("Laba BBRI naik");
    expect(parsed.results[0].dimension?.financials).toBe(1);
  });

  it("accepts articles with only the required fields", () => {
    const parsed = newsResponseSchema.parse({
      results: [{ title: "Headline", timestamp: "2025-06-30T00:00:00Z" }],
    });
    expect(parsed.results).toHaveLength(1);
  });

  it("rejects a payload missing the results array", () => {
    expect(() => newsResponseSchema.parse({ nonsense: true })).toThrow();
  });
});

describe("parseIndexSeries", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    index_code: "IHSG",
    date: "2026-06-25",
    price: 5999.038,
    ...over,
  });

  it("maps the index level from price onto close", () => {
    // The index endpoint reports `price` while the stock endpoint reports
    // `close`. Parsing an index with the stock parser drops every row, which
    // empties the date intersection and makes a twin look impossible to build.
    const bars = parseIndexSeries([row()]);
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBeCloseTo(5999.038, 6);
    expect(bars[0].date).toBe("2026-06-25");
  });

  it("is not interchangeable with the stock parser", () => {
    // Pins the regression directly: the stock parser must reject index rows,
    // which is why a dedicated parser exists.
    expect(parseDailySeries([row()]).bars).toHaveLength(0);
  });

  it("drops non-positive levels", () => {
    expect(parseIndexSeries([row({ price: 0 })])).toHaveLength(0);
  });

  it("sorts chronologically", () => {
    const bars = parseIndexSeries([
      row({ date: "2026-07-01" }),
      row({ date: "2026-06-25" }),
    ]);
    expect(bars.map((b) => b.date)).toEqual(["2026-06-25", "2026-07-01"]);
  });

  it("returns empty for a malformed payload", () => {
    expect(parseIndexSeries({ error: "bad code" })).toEqual([]);
    expect(parseIndexSeries(null)).toEqual([]);
  });
});

describe("parseForeignFlow", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    date: "2025-05-02",
    net_foreign_inflow: 146_476_750_000,
    foreign_buy_idr: 558_094_712_500,
    foreign_sell_idr: 411_617_962_500,
    foreign_share: 0.5875,
    ...over,
  });

  it("maps a flow response onto the engine's shape", () => {
    const points = parseForeignFlow({ symbol: "BBCA.JK", data: [row()] });
    expect(points).toHaveLength(1);
    expect(points[0].netInflow).toBe(146_476_750_000);
    expect(points[0].foreignShare).toBe(0.5875);
  });

  it("drops days with no net figure rather than treating them as zero", () => {
    // A null inflow means "not reported", and counting it as zero flow would
    // dilute the intensity measure with days that carry no information.
    const points = parseForeignFlow({
      symbol: "BBCA",
      data: [row(), row({ date: "2025-05-03", net_foreign_inflow: null })],
    });
    expect(points).toHaveLength(1);
  });

  it("sorts by date regardless of the order received", () => {
    const points = parseForeignFlow({
      symbol: "BBCA",
      data: [row({ date: "2025-05-05" }), row({ date: "2025-05-01" })],
    });
    expect(points.map((p) => p.date)).toEqual(["2025-05-01", "2025-05-05"]);
  });

  it("returns empty for a malformed payload", () => {
    expect(parseForeignFlow({ nonsense: true })).toEqual([]);
    expect(parseForeignFlow(null)).toEqual([]);
  });
});

describe("parseOwnership", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    date: "2025-03-31",
    shares_number: 1_000_000,
    total_l: 600_000,
    total_f: 400_000,
    individual_l: 200_000,
    individual_f: 50_000,
    numbers_of_shareholders: 12_000,
    ...over,
  });

  it("derives institutional holdings as total minus individual", () => {
    // Summing the named institutional categories would under-count silently
    // whenever the API adds a category we do not know about.
    const snapshots = parseOwnership({ symbol: "BBCA", data: [row()] });
    expect(snapshots[0].institutionalLocal).toBe(400_000);
    expect(snapshots[0].institutionalForeign).toBe(350_000);
  });

  it("never reports a negative institutional holding", () => {
    const snapshots = parseOwnership({
      symbol: "BBCA",
      data: [row({ total_l: 100_000, individual_l: 200_000 })],
    });
    expect(snapshots[0].institutionalLocal).toBe(0);
  });

  it("treats null categories as zero holdings", () => {
    const snapshots = parseOwnership({
      symbol: "BBCA",
      data: [row({ total_f: null, individual_f: null })],
    });
    expect(snapshots[0].institutionalForeign).toBe(0);
  });

  it("preserves a null outstanding share count so the caller can skip the row", () => {
    // Share-of-outstanding is meaningless without a denominator, and the
    // engine filters these rows out rather than dividing by a guess.
    const snapshots = parseOwnership({
      symbol: "BBCA",
      data: [row({ shares_number: null })],
    });
    expect(snapshots[0].sharesOutstanding).toBeNull();
  });

  it("sorts snapshots chronologically", () => {
    const snapshots = parseOwnership({
      symbol: "BBCA",
      data: [row({ date: "2025-06-30" }), row({ date: "2025-01-31" })],
    });
    expect(snapshots.map((s) => s.date)).toEqual(["2025-01-31", "2025-06-30"]);
  });

  it("returns empty for a malformed payload", () => {
    expect(parseOwnership({ nonsense: true })).toEqual([]);
  });
});
