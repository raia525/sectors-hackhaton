import { describe, expect, it } from "vitest";
import {
  analyzeSmartMoney,
  classifyDivergence,
  computeConviction,
  summarizeForeignFlow,
  summarizeOwnership,
} from "./engine";
import type { ForeignFlowPoint, OwnershipSnapshot } from "./types";
import type { DailyBar } from "@/lib/shadow/types";

function bars(days: number, drift: number): DailyBar[] {
  let price = 5000;
  return new Array(days).fill(null).map((_, i) => {
    price *= 1 + drift;
    return {
      date: new Date(Date.UTC(2025, 0, 6 + i)).toISOString().slice(0, 10),
      close: Math.round(price),
      open: null,
      high: null,
      low: null,
      volume: 10_000_000,
      marketCap: 0,
    };
  });
}

function flow(days: number, perDay: number): ForeignFlowPoint[] {
  return new Array(days).fill(null).map((_, i) => ({
    date: new Date(Date.UTC(2025, 0, 6 + i)).toISOString().slice(0, 10),
    netInflow: perDay,
    buyIdr: null,
    sellIdr: null,
    foreignShare: null,
  }));
}

function ownership(
  months: number,
  startPct: number,
  endPct: number,
  retail: [number, number] = [20, 20],
): OwnershipSnapshot[] {
  const total = 1_000_000_000;
  return new Array(months).fill(null).map((_, i) => {
    const t = months === 1 ? 0 : i / (months - 1);
    const inst = (startPct + (endPct - startPct) * t) / 100;
    const ret = (retail[0] + (retail[1] - retail[0]) * t) / 100;
    return {
      date: `2025-0${i + 1}-28`,
      sharesOutstanding: total,
      institutionalLocal: Math.round(total * inst * 0.6),
      institutionalForeign: Math.round(total * inst * 0.4),
      individualLocal: Math.round(total * ret),
      individualForeign: 0,
      numberOfShareholders: 10_000,
    };
  });
}

describe("summarizeForeignFlow", () => {
  it("normalises net flow against traded value", () => {
    const b = bars(20, 0);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const summary = summarizeForeignFlow(flow(20, tradedValue * 0.002 / 20), b);
    expect(summary.intensity).toBeGreaterThan(0);
    expect(summary.direction).toBe("neutral"); // below the 1% noise floor
  });

  it("flags accumulation above the noise floor", () => {
    const b = bars(20, 0);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const summary = summarizeForeignFlow(flow(20, (tradedValue * 0.05) / 20), b);
    expect(summary.direction).toBe("accumulating");
  });

  it("counts a one-way streak from the latest session", () => {
    const summary = summarizeForeignFlow(flow(15, 1_000_000), bars(15, 0));
    expect(summary.streak).toBe(15);
    expect(summary.positiveSessionShare).toBe(1);
  });

  it("stops the streak at a sign change", () => {
    const f = flow(10, 1_000_000);
    f[4].netInflow = -5_000_000;
    const summary = summarizeForeignFlow(f, bars(10, 0));
    expect(summary.streak).toBe(5);
  });

  it("returns a neutral summary for empty flow", () => {
    const summary = summarizeForeignFlow([], bars(10, 0));
    expect(summary.direction).toBe("neutral");
    expect(summary.netIdr).toBe(0);
  });
});

describe("summarizeOwnership", () => {
  it("measures the change in share of outstanding, not raw share counts", () => {
    const shift = summarizeOwnership(ownership(6, 40, 45));
    expect(shift).not.toBeNull();
    expect(shift!.shareChangePp).toBeCloseTo(5, 6);
    expect(shift!.direction).toBe("accumulating");
  });

  it("treats a move inside reporting noise as neutral", () => {
    const shift = summarizeOwnership(ownership(6, 40, 40.1));
    expect(shift!.direction).toBe("neutral");
  });

  it("returns null with fewer than two usable snapshots", () => {
    expect(summarizeOwnership(ownership(1, 40, 40))).toBeNull();
    expect(summarizeOwnership([])).toBeNull();
  });

  it("ignores snapshots with no outstanding share count", () => {
    const snaps = ownership(3, 40, 44);
    snaps.forEach((s) => (s.sharesOutstanding = null));
    expect(summarizeOwnership(snaps)).toBeNull();
  });
});

describe("classifyDivergence", () => {
  it("calls price down against accumulation a bullish divergence", () => {
    expect(classifyDivergence(-0.08, "accumulating", null)).toBe("bullish_divergence");
  });

  it("calls price up against distribution a bearish divergence", () => {
    expect(classifyDivergence(0.08, "distributing", null)).toBe("bearish_divergence");
  });

  it("labels agreement as confirmation rather than divergence", () => {
    expect(classifyDivergence(0.08, "accumulating", null)).toBe("confirmation_up");
    expect(classifyDivergence(-0.08, "distributing", null)).toBe("confirmation_down");
  });

  it("lets the slower ownership signal override daily flow", () => {
    // Ownership is the higher-quality signal when the two disagree.
    expect(classifyDivergence(-0.08, "distributing", "accumulating")).toBe(
      "bullish_divergence",
    );
  });

  it("returns no signal when smart money is neutral or price is flat", () => {
    expect(classifyDivergence(-0.08, "neutral", null)).toBe("no_signal");
    expect(classifyDivergence(0.001, "accumulating", null)).toBe("no_signal");
  });
});

describe("computeConviction", () => {
  const strongFlow = {
    direction: "accumulating" as const,
    netIdr: 1e12,
    intensity: 0.06,
    streak: 12,
    positiveSessionShare: 1,
  };

  it("stays within 0 and 100", () => {
    const score = computeConviction(
      "bullish_divergence",
      strongFlow,
      { direction: "accumulating", shareChangePp: 6, months: 6, retailShareChangePp: -4 },
      -0.2,
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores divergence above confirmation on identical inputs", () => {
    const div = computeConviction("bullish_divergence", strongFlow, null, -0.1);
    const conf = computeConviction("confirmation_up", strongFlow, null, 0.1);
    expect(div).toBeGreaterThan(conf);
  });

  it("scores no signal as zero", () => {
    expect(computeConviction("no_signal", strongFlow, null, 0.1)).toBe(0);
  });

  it("rewards ownership confirmation", () => {
    const withOwnership = computeConviction(
      "bullish_divergence",
      strongFlow,
      { direction: "accumulating", shareChangePp: 4, months: 6, retailShareChangePp: -3 },
      -0.1,
    );
    const without = computeConviction("bullish_divergence", strongFlow, null, -0.1);
    expect(withOwnership).toBeGreaterThan(without);
  });
});

describe("analyzeSmartMoney", () => {
  it("detects accumulation into a falling price", () => {
    const b = bars(60, -0.002);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const result = analyzeSmartMoney({
      symbol: "BBRI",
      bars: b,
      foreignFlow: flow(60, (tradedValue * 0.05) / 60),
      ownership: ownership(6, 40, 45, [25, 20]),
    });

    expect(result.type).toBe("bullish_divergence");
    expect(result.conviction).toBeGreaterThan(50);
    expect(result.findings.map((f) => f.key)).toContain("smartmoney.meaning.bullish");
  });

  it("refuses to score when history is too thin", () => {
    const result = analyzeSmartMoney({
      symbol: "BBRI",
      bars: bars(5, 0.01),
      foreignFlow: flow(5, 1e9),
      ownership: [],
    });
    expect(result.insufficientData).toBe(true);
    expect(result.conviction).toBe(0);
    expect(result.type).toBe("no_signal");
  });

  it("scopes itself to flow and ownership data, never insider dealings", () => {
    // The data source has no director-level transactions; the caveat must say
    // so explicitly and findings must never claim otherwise. The wording lives
    // in the dictionary now, so this checks message keys; a companion test in
    // the i18n suite checks every dictionary entry never contains "insider".
    const b = bars(60, -0.002);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const result = analyzeSmartMoney({
      symbol: "BBRI",
      bars: b,
      foreignFlow: flow(60, (tradedValue * 0.05) / 60),
      ownership: ownership(6, 40, 45),
    });

    expect(result.caveats.map((c) => c.key)).toContain("smartmoney.caveat.scope");
  });

  it("formats the summary figures instead of passing raw fractions to the screen", () => {
    // Regression: params are interpolated verbatim, so a raw fraction once
    // reached the UI as "0.1232394361971826".
    const b = bars(60, -0.002);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const result = analyzeSmartMoney({
      symbol: "BBRI",
      bars: b,
      foreignFlow: flow(60, (tradedValue * 0.05) / 60),
      ownership: ownership(6, 40, 45),
    });

    const summary = result.findings.find((f) => f.key === "smartmoney.summaryLine");
    expect(summary?.params?.priceReturn).toMatch(/^[+-]?\d+\.\d{2}%$/);
    expect(summary?.params?.flowIntensity).toMatch(/^[+-]?\d+\.\d{2}%$/);
    expect(summary?.params?.flowValue).toMatch(/^-?Rp /);
  });

  it("states that conviction is not a return forecast", () => {
    const b = bars(60, 0.002);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const result = analyzeSmartMoney({
      symbol: "TLKM",
      bars: b,
      foreignFlow: flow(60, (-tradedValue * 0.05) / 60),
      ownership: ownership(6, 45, 40),
    });
    expect(result.caveats.map((c) => c.key)).toContain("smartmoney.caveat.notForecast");
  });

  it("falls back to foreign flow alone when ownership is unavailable", () => {
    const b = bars(60, 0.003);
    const tradedValue = b.reduce((s, x) => s + x.close * x.volume, 0);
    const result = analyzeSmartMoney({
      symbol: "GOTO",
      bars: b,
      foreignFlow: flow(60, (-tradedValue * 0.04) / 60),
      ownership: [],
    });
    expect(result.type).toBe("bearish_divergence");
    expect(result.caveats.map((c) => c.key)).toContain("smartmoney.caveat.flowOnly");
  });
});
