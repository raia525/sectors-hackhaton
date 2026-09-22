import { describe, expect, it } from "vitest";
import { buildKeyStats } from "./key-stats";
import { companyReportSchema } from "@/lib/sectors/schemas";
import type { DailyBar } from "@/lib/shadow/types";

function bars(closes: number[]): DailyBar[] {
  return closes.map((close, i) => ({
    date: new Date(Date.UTC(2025, 0, 6 + i)).toISOString().slice(0, 10),
    close,
    open: null,
    high: null,
    low: null,
    volume: 1_000_000,
    marketCap: 0,
  }));
}

function findStat(
  stats: ReturnType<typeof buildKeyStats>,
  label: string,
): number | null {
  for (const group of stats.groups) {
    const hit = group.stats.find((s) => s.label === label);
    if (hit) return hit.value;
  }
  throw new Error(`No stat labelled ${label}`);
}

describe("buildKeyStats", () => {
  it("derives profitability ratios from the latest financial year", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      financials: {
        historical_financials: [
          { year: 2023, revenue: 100, earnings: 10, total_equity: 50, total_liabilities: 25 },
          { year: 2024, revenue: 200, earnings: 40, total_equity: 100, total_liabilities: 150 },
        ],
      },
    });

    const stats = buildKeyStats(report, bars([100, 101]));
    expect(findStat(stats, "Return on equity")).toBeCloseTo(0.4, 10);
    expect(findStat(stats, "Net margin")).toBeCloseTo(0.2, 10);
    expect(findStat(stats, "Debt to equity")).toBeCloseTo(1.5, 10);
  });

  it("reports null rather than zero when a figure is absent", () => {
    // A company with no reported ROE and one that earned nothing are different
    // facts; collapsing both to zero would state something untrue.
    const stats = buildKeyStats(companyReportSchema.parse({ symbol: "GOTO" }), []);
    expect(findStat(stats, "Return on equity")).toBeNull();
    expect(findStat(stats, "Dividend yield")).toBeNull();
  });

  it("avoids dividing by zero equity", () => {
    const report = companyReportSchema.parse({
      symbol: "ZERO",
      financials: {
        historical_financials: [
          { year: 2024, revenue: 100, earnings: 10, total_equity: 0, total_liabilities: 5 },
        ],
      },
    });
    const stats = buildKeyStats(report, []);
    expect(findStat(stats, "Return on equity")).toBeNull();
    expect(findStat(stats, "Debt to equity")).toBeNull();
  });

  it("locates the price within its 52 week range", () => {
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      overview: {
        last_close_price: 5000,
        all_time_price: {
          "52_w_low": { "2025-01-14": 4000 },
          "52_w_high": { "2025-05-02": 6000 },
        },
      },
    });

    const stats = buildKeyStats(report, []);
    expect(stats.low52).toBe(4000);
    expect(stats.high52).toBe(6000);
    expect(stats.rangePosition).toBeCloseTo(0.5, 10);
  });

  it("returns no range position when the extremes are missing", () => {
    const stats = buildKeyStats(
      companyReportSchema.parse({ symbol: "BBRI", overview: { last_close_price: 5000 } }),
      [],
    );
    expect(stats.rangePosition).toBeNull();
  });

  it("clamps a price sitting outside its reported range", () => {
    // The range and the last close come from different fields and can
    // disagree; a position above 1 would render a marker off the track.
    const report = companyReportSchema.parse({
      symbol: "BBRI",
      overview: {
        last_close_price: 7000,
        all_time_price: {
          "52_w_low": { "2025-01-14": 4000 },
          "52_w_high": { "2025-05-02": 6000 },
        },
      },
    });
    expect(buildKeyStats(report, []).rangePosition).toBe(1);
  });

  it("computes annualised volatility from the price series", () => {
    const stats = buildKeyStats(
      companyReportSchema.parse({ symbol: "BBRI" }),
      bars([100, 102, 99, 103, 101]),
    );
    expect(findStat(stats, "Annualised volatility")).toBeGreaterThan(0);
  });

  it("falls back to the last bar when the report has no close price", () => {
    const stats = buildKeyStats(
      companyReportSchema.parse({ symbol: "BBRI" }),
      bars([100, 4321]),
    );
    expect(stats.lastClose).toBe(4321);
  });
});
