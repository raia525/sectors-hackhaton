import { describe, expect, it } from "vitest";
import {
  describeRule,
  evaluateRules,
  formatMetric,
  isMet,
  metricValue,
  parseRuleInput,
  presetValue,
  retune,
  roundToTick,
  suggestRules,
  tickSize,
  toRuleInput,
  type RuleState,
} from "./custom-rules";
import { marketFacts } from "@/lib/analysis/market-facts";
import { readSnapshotFacts, readStoredAnalysis, type WatchFacts } from "@/lib/intelligence/watch-facts";
import type { DailyBar } from "@/lib/shadow/types";

const bar = (date: string, close: number, volume = 1_000_000): DailyBar => ({
  date,
  close,
  open: null,
  high: null,
  low: null,
  volume,
  marketCap: 0,
});

describe("marketFacts", () => {
  it("reads the latest session, five-day change and volume against the prior average", () => {
    const bars = Array.from({ length: 25 }, (_, i) => bar(`2026-09-${String(i + 1).padStart(2, "0")}`, 1000 + i * 10));
    bars[24] = bar("2026-09-25", 1250, 3_000_000);
    const f = marketFacts(bars);
    expect(f.asOf).toBe("2026-09-25");
    expect(f.lastClose).toBe(1250);
    expect(f.prevClose).toBe(1230);
    expect(f.change1d).toBeCloseTo(1250 / 1230 - 1);
    expect(f.return5d).toBeCloseTo(1250 / 1190 - 1);
    expect(f.avgVolume20).toBe(1_000_000);
    expect(f.volumeRatio).toBe(3);
    expect(f.dailyVolatility).toBeGreaterThan(0);
  });

  it("leaves unknowns as null rather than zero on a short or empty series", () => {
    expect(marketFacts([])).toMatchObject({ lastClose: null, change1d: null, volume: null, volumeRatio: null, dailyVolatility: null });
    const short = marketFacts([bar("2026-09-01", 100), bar("2026-09-02", 101)]);
    expect(short.change1d).toBeCloseTo(0.01);
    expect(short.return5d).toBeNull();
    expect(short.avgVolume20).toBeNull();
    expect(short.volumeRatio).toBeNull();
    expect(short.dailyVolatility).toBeNull();
  });
});

const snapshot = {
  symbol: "BBRI",
  runDate: "2026-10-02",
  asOf: "2026-10-02",
  zScore: -2.4,
  fitQuality: 0.6,
  constituentCount: 5,
  totalReturn: 0.05,
  marketReturn: 0.01,
  sectorReturn: 0.01,
  idioReturn: 0.03,
  realityVerdict: "confirmed",
  smartMoneyType: null,
  smartMoneyConviction: null,
  marketFacts: {
    asOf: "2026-10-02",
    lastClose: 4500,
    prevClose: 4400,
    change1d: 0.0227,
    return5d: 0.04,
    volume: 90_000_000,
    avgVolume20: 30_000_000,
    volumeRatio: 3,
    dailyVolatility: 0.02,
  },
  keyStats: {
    groups: [
      { titleKey: "keystats.groupValuation", stats: [{ labelKey: "keystats.pe", value: 11.5, format: "multiple" }] },
      { titleKey: "keystats.groupPerformance", stats: [{ labelKey: "keystats.earningsGrowth", value: -0.25, format: "percent" }] },
      { titleKey: "keystats.groupIncome", stats: [{ labelKey: "keystats.dividendYield", value: 0.062, format: "percent" }] },
    ],
    rangePosition: 0.08,
    low52: 4100,
    high52: 6000,
    lastClose: 4500,
  },
};

describe("readSnapshotFacts", () => {
  it("parses the stored facts and flattens key statistics", () => {
    const f = readSnapshotFacts(snapshot);
    expect(f.prices?.lastClose).toBe(4500);
    expect(f.stats).toMatchObject({ pe: 11.5, earningsGrowth: -0.25, dividendYield: 0.062, rangePosition: 0.08, pb: null });
    expect(f.peers).toBe(5);
  });

  it("yields nulls for snapshots stored before the facts existed or with an odd shape", () => {
    const old = readSnapshotFacts({ ...snapshot, marketFacts: null, keyStats: { groups: "nope" } });
    expect(old.prices).toBeNull();
    expect(old.keyStats).toBeNull();
    expect(old.stats.pe).toBeNull();
    const partial = readSnapshotFacts({ ...snapshot, marketFacts: { ...snapshot.marketFacts, volume: "lots" } });
    expect(partial.prices?.volume).toBeNull();
    expect(partial.prices?.lastClose).toBe(4500);
  });

  it("reads stored caveats and the fit window, or nothing", () => {
    expect(readStoredAnalysis({ shadow: { fitWindow: 60, warnings: [{ key: "a" }] }, realityCheck: { caveats: [{ key: "b" }] } })).toEqual({
      caveats: [{ key: "a" }, { key: "b" }],
      fitWindow: 60,
    });
    expect(readStoredAnalysis("broken")).toEqual({ caveats: [], fitWindow: null });
  });
});

const facts: WatchFacts = readSnapshotFacts(snapshot);
const rule = (over: Partial<RuleState>): RuleState => ({
  id: "r1",
  metric: "PRICE",
  operator: "LTE",
  value: 4500,
  enabled: true,
  autoTune: false,
  preset: null,
  note: null,
  lastMet: null,
  ...over,
});

describe("metrics and operators", () => {
  it("reads every metric from the facts", () => {
    expect(metricValue(facts, "PRICE")).toBe(4500);
    expect(metricValue(facts, "VOLUME_RATIO")).toBe(3);
    expect(metricValue(facts, "Z_SCORE")).toBe(2.4);
    expect(metricValue(facts, "STOCK_SPECIFIC")).toBe(0.03);
    expect(metricValue(facts, "PE")).toBe(11.5);
    expect(metricValue(facts, "PB")).toBeNull();
    expect(metricValue(facts, "RANGE_POSITION")).toBe(0.08);
    expect(metricValue({ ...facts, prices: null }, "VOLUME")).toBeNull();
  });

  it("compares with every operator", () => {
    expect(isMet(10, "LT", 11, "PE")).toBe(true);
    expect(isMet(11, "LT", 11, "PE")).toBe(false);
    expect(isMet(11, "LTE", 11, "PE")).toBe(true);
    expect(isMet(12, "GT", 11, "PE")).toBe(true);
    expect(isMet(11, "GTE", 11, "PE")).toBe(true);
    expect(isMet(10.9, "GTE", 11, "PE")).toBe(false);
  });

  it("allows a tolerance for equals: one tick for prices, 0.5% otherwise", () => {
    expect(tickSize(150)).toBe(1);
    expect(tickSize(4500)).toBe(10);
    expect(tickSize(9000)).toBe(25);
    expect(isMet(4505, "EQ", 4500, "PRICE")).toBe(true);
    expect(isMet(4510, "EQ", 4500, "PRICE")).toBe(false);
    expect(isMet(11.55, "EQ", 11.5, "PE")).toBe(true);
    expect(isMet(11.7, "EQ", 11.5, "PE")).toBe(false);
  });

  it("converts percent input and formats each unit", () => {
    expect(parseRuleInput("CHANGE_1D", -3)).toBeCloseTo(-0.03);
    expect(parseRuleInput("PRICE", 4500)).toBe(4500);
    expect(toRuleInput("DIVIDEND_YIELD", 0.062)).toBe(6.2);
    expect(formatMetric("PRICE", 4350)).toBe("Rp 4.350");
    expect(formatMetric("CHANGE_1D", -0.031)).toBe("-3.10%");
    expect(formatMetric("RANGE_POSITION", 0.08)).toBe("8%");
    expect(formatMetric("VOLUME_RATIO", 2)).toBe("2.0x");
    expect(describeRule({ metric: "PRICE", operator: "LTE", value: 4350 })).toMatchObject({
      key: "rule.condition",
      params: { op: "≤", value: "Rp 4.350" },
    });
  });
});

describe("evaluateRules", () => {
  it("fires once when the condition becomes true", () => {
    const first = evaluateRules([rule({ lastMet: false })], facts);
    expect(first.outcomes[0]).toMatchObject({ met: true, triggered: true, value: 4500 });
    expect(first.alerts[0]).toMatchObject({ kind: "RULE", symbol: "BBRI", title: { key: "alert.ruleTitle" } });
    // Still true on the next run: silent.
    expect(evaluateRules([rule({ lastMet: true })], facts).alerts).toEqual([]);
  });

  it("re-arms after the condition clears", () => {
    const cleared = evaluateRules([rule({ value: 4000, lastMet: true })], facts);
    expect(cleared.outcomes[0]).toMatchObject({ met: false, triggered: false });
    expect(evaluateRules([rule({ value: 4600, lastMet: false })], facts).alerts).toHaveLength(1);
  });

  it("skips paused rules and never fires on missing data", () => {
    expect(evaluateRules([rule({ enabled: false })], facts).outcomes).toEqual([]);
    const missing = evaluateRules([rule({ metric: "PB", operator: "LT", value: 99 })], facts);
    expect(missing.outcomes[0]).toEqual({ id: "r1", met: null, value: null, triggered: false });
    expect(missing.alerts).toEqual([]);
  });

  it("carries the note into the alert", () => {
    const { alerts } = evaluateRules([rule({ note: "Buy zone?" })], facts);
    expect(alerts[0].body.map((b) => b.key)).toEqual(["alert.ruleBody", "alert.ruleNote"]);
  });
});

describe("suggestions and auto-adjust", () => {
  it("suggests bands from the stock's own volatility, rounded to real ticks", () => {
    const list = suggestRules(facts, 2);
    const drop = list.find((s) => s.preset === "priceDrop");
    const rise = list.find((s) => s.preset === "priceRise");
    // 2 x 2% daily volatility = 4% band around 4,500, on 10 rupiah ticks.
    expect(drop).toMatchObject({ metric: "PRICE", operator: "LTE", value: 4320 });
    expect(rise).toMatchObject({ metric: "PRICE", operator: "GTE", value: 4680 });
    expect(list.find((s) => s.preset === "divergence")?.value).toBe(2.9);
    expect(list.map((s) => s.preset)).toContain("nearLow");
  });

  it("widens with volatility and keeps a minimum band for calm stocks", () => {
    const wild = { ...facts, prices: { ...facts.prices!, dailyVolatility: 0.05 } };
    const calm = { ...facts, prices: { ...facts.prices!, dailyVolatility: 0.002 } };
    expect(presetValue("priceDrop", wild, 2)).toBe(roundToTick(4500 * 0.9, "down"));
    expect(presetValue("priceDrop", calm, 2)).toBe(roundToTick(4500 * 0.97, "down"));
  });

  it("suggests nothing it has no data for", () => {
    const bare = { ...facts, prices: null, stats: { ...facts.stats, rangePosition: null } };
    expect(suggestRules(bare, 2).map((s) => s.preset)).toEqual(["divergence"]);
  });

  it("re-tunes only auto rules with a known preset, and only when the value moves", () => {
    const moved = { ...facts, prices: { ...facts.prices!, lastClose: 5000 } };
    expect(retune({ autoTune: true, preset: "priceDrop", value: 4320 }, moved, 2)).toBe(4800);
    expect(retune({ autoTune: true, preset: "priceDrop", value: 4320 }, facts, 2)).toBeNull();
    expect(retune({ autoTune: false, preset: "priceDrop", value: 1 }, moved, 2)).toBeNull();
    expect(retune({ autoTune: true, preset: "made-up", value: 1 }, moved, 2)).toBeNull();
  });
});
