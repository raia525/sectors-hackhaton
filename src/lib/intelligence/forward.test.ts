import { describe, expect, it } from "vitest";
import { forwardOutcome } from "./forward";
import type { ShadowPoint } from "@/lib/shadow/types";

/** A series where the stock grows 2% a session and the twin 1%. */
function series(dates: string[]): ShadowPoint[] {
  return dates.map((date, i) => {
    const actual = 1.02 ** (i + 1) - 1;
    const shadow = 1.01 ** (i + 1) - 1;
    return { date, actual, shadow, divergence: actual - shadow };
  });
}

const DATES = [
  "2026-01-02",
  "2026-01-05",
  "2026-01-06",
  "2026-01-07",
  "2026-01-08",
  "2026-01-09",
  "2026-01-12",
];

describe("forwardOutcome", () => {
  it("measures the move between the signal date and the session N later", () => {
    const result = forwardOutcome(series(DATES), "2026-01-02", 5);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.outcome.stockReturn).toBeCloseTo(1.02 ** 5 - 1, 10);
    expect(result.outcome.twinReturn).toBeCloseTo(1.01 ** 5 - 1, 10);
  });

  it("stays pending until enough sessions have passed", () => {
    expect(forwardOutcome(series(DATES), "2026-01-08", 5)).toEqual({ status: "pending" });
  });

  it("is pending when the date is newer than anything in the series", () => {
    expect(forwardOutcome(series(DATES), "2026-02-01", 5)).toEqual({ status: "pending" });
  });

  it("is unresolvable once the date has left the window", () => {
    expect(forwardOutcome(series(DATES), "2025-12-01", 5)).toEqual({ status: "unresolvable" });
  });

  it("is pending on an empty series rather than guessing", () => {
    expect(forwardOutcome([], "2026-01-02", 5)).toEqual({ status: "pending" });
  });
});
