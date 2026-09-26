import { describe, expect, it } from "vitest";
import { isSignal, MIN_SAMPLE, summarizeTrackRecord, type ResolvedRow } from "./track-record";

function row(over: Partial<ResolvedRow> = {}): ResolvedRow {
  return {
    zScore: 2.5,
    fitQuality: 0.6,
    constituentCount: 5,
    forwardStockReturn: 0.03,
    forwardTwinReturn: 0.01,
    ...over,
  };
}

describe("isSignal", () => {
  it("requires a large divergence, a trustworthy fit and enough peers", () => {
    expect(isSignal(row())).toBe(true);
    expect(isSignal(row({ zScore: -2.1 }))).toBe(true);
    expect(isSignal(row({ zScore: 1.9 }))).toBe(false);
    expect(isSignal(row({ fitQuality: 0.2 }))).toBe(false);
    expect(isSignal(row({ constituentCount: 2 }))).toBe(false);
  });
});

describe("summarizeTrackRecord", () => {
  it("refuses to state a rate below the minimum sample", () => {
    const record = summarizeTrackRecord(Array.from({ length: MIN_SAMPLE - 1 }, () => row()));
    expect(record.enough).toBe(false);
    expect(record.signals.count).toBe(MIN_SAMPLE - 1);
    expect(record.signals.continuedShare).toBeNull();
    expect(record.signals.avgSignedExcess).toBeNull();
  });

  it("counts a gap as continued when the stock kept beating its twin in the signal's direction", () => {
    const rows = [
      // Positive signal, stock then beat the twin: continued.
      ...Array.from({ length: 6 }, () => row()),
      // Negative signal, stock then lagged the twin: also continued.
      ...Array.from({ length: 2 }, () =>
        row({ zScore: -3, forwardStockReturn: -0.02, forwardTwinReturn: 0 }),
      ),
      // Positive signal that closed: reversed.
      ...Array.from({ length: 2 }, () =>
        row({ forwardStockReturn: -0.01, forwardTwinReturn: 0.01 }),
      ),
    ];
    const record = summarizeTrackRecord(rows);
    expect(record.enough).toBe(true);
    expect(record.signals.count).toBe(10);
    expect(record.signals.continuedShare).toBeCloseTo(0.8, 10);
    // 6 x 0.02 + 2 x 0.02 + 2 x -0.02, over 10.
    expect(record.signals.avgSignedExcess).toBeCloseTo(0.012, 10);
  });

  it("keeps ordinary days in their own bucket for comparison", () => {
    const rows = [
      ...Array.from({ length: 10 }, () => row()),
      ...Array.from({ length: 12 }, () => row({ zScore: 0.5 })),
    ];
    const record = summarizeTrackRecord(rows);
    expect(record.signals.count).toBe(10);
    expect(record.ordinary.count).toBe(12);
    expect(record.ordinary.continuedShare).toBe(1);
  });

  it("leaves out days with no direction instead of counting them either way", () => {
    const record = summarizeTrackRecord([row({ zScore: 0 })]);
    expect(record.signals.count).toBe(0);
    expect(record.ordinary.count).toBe(0);
  });
});
