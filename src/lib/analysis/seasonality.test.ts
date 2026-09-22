import { describe, expect, it } from "vitest";
import { analyzeSeasonality } from "./seasonality";
import type { DailyBar } from "@/lib/shadow/types";

/** Builds daily bars across whole years with a per-month return applied. */
function barsAcrossYears(
  years: number[],
  monthReturn: (year: number, month: number) => number,
): DailyBar[] {
  const bars: DailyBar[] = [];
  let price = 1000;

  for (const year of years) {
    for (let month = 1; month <= 12; month += 1) {
      const ret = monthReturn(year, month);
      // Two bars per month is enough to define a month's return.
      const start = price;
      const end = start * (1 + ret);
      for (const [day, close] of [
        [2, start],
        [26, end],
      ] as const) {
        bars.push({
          date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          close: Math.round(close * 100) / 100,
          open: null,
          high: null,
          low: null,
          volume: 1_000_000,
          marketCap: 0,
        });
      }
      price = end;
    }
  }
  return bars;
}

describe("analyzeSeasonality", () => {
  it("identifies a consistently strong month across enough years", () => {
    const bars = barsAcrossYears([2020, 2021, 2022, 2023, 2024], (_, m) =>
      m === 12 ? 0.05 : 0.001,
    );
    const result = analyzeSeasonality(bars);

    expect(result.best?.month).toBe(12);
    expect(result.best?.reliable).toBe(true);
    expect(result.best?.hitRate).toBe(1);
    expect(result.totalYears).toBe(5);
  });

  it("refuses to call a month a tendency without enough years", () => {
    // Two years of data is not a seasonal pattern, however clean it looks.
    const bars = barsAcrossYears([2023, 2024], (_, m) => (m === 12 ? 0.08 : 0));
    const result = analyzeSeasonality(bars);

    expect(result.months.every((m) => !m.reliable)).toBe(true);
    expect(result.best).toBeNull();
    expect(result.caveats.join(" ")).toMatch(/No month has at least/);
  });

  it("reports the sample size for every month", () => {
    const bars = barsAcrossYears([2021, 2022, 2023, 2024], () => 0.01);
    const result = analyzeSeasonality(bars);
    expect(result.months.every((m) => m.years === 4)).toBe(true);
  });

  it("flags a month whose average hides wildly inconsistent years", () => {
    // +15, -9, +4, -1, +6 averages positive but describes no typical year.
    const swings = [0.15, -0.09, 0.04, -0.01, 0.06];
    const bars = barsAcrossYears([2020, 2021, 2022, 2023, 2024], (y, m) =>
      m === 3 ? swings[y - 2020] : 0.001,
    );
    const result = analyzeSeasonality(bars);

    const march = result.months.find((m) => m.month === 3)!;
    expect(march.volatility).toBeGreaterThan(Math.abs(march.averageReturn));
    expect(result.caveats.join(" ")).toMatch(/spread of outcomes/);
  });

  it("always states that seasonality is not predictive", () => {
    const result = analyzeSeasonality(barsAcrossYears([2024], () => 0.01));
    expect(result.caveats[0]).toMatch(/no information about what any future month will do/);
  });

  it("reports both mean and median so a single outlier year is visible", () => {
    const bars = barsAcrossYears([2020, 2021, 2022, 2023, 2024], (y, m) =>
      m === 6 ? (y === 2020 ? 0.6 : 0.01) : 0.001,
    );
    const june = analyzeSeasonality(bars).months.find((m) => m.month === 6)!;
    expect(june.averageReturn).toBeGreaterThan(june.medianReturn);
  });

  it("handles an empty or unusable series without throwing", () => {
    expect(analyzeSeasonality([]).months).toEqual([]);
    expect(analyzeSeasonality([]).best).toBeNull();
  });
});
