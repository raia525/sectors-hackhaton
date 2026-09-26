import { describe, expect, it } from "vitest";
import { buildBrief, type BriefRow } from "./brief";

function row(over: Partial<BriefRow> = {}): BriefRow {
  return {
    symbol: "BBRI",
    companyName: "Bank Rakyat Indonesia",
    sector: "Financials",
    zScore: 1,
    verdict: "normal",
    fitQuality: 0.6,
    constituentCount: 5,
    totalReturn: 0.05,
    marketReturn: 0.02,
    sectorReturn: 0.01,
    idioReturn: 0.02,
    realityVerdict: "confirmed",
    smartMoneyType: null,
    smartMoneyConviction: null,
    ...over,
  };
}

describe("buildBrief", () => {
  it("ranks reliable stocks by the size of their divergence, either direction", () => {
    const brief = buildBrief([
      row({ symbol: "AAAA", zScore: 1 }),
      row({ symbol: "BBBB", zScore: -3 }),
      row({ symbol: "CCCC", zScore: 2.5 }),
    ]);
    expect(brief.movers.map((r) => r.symbol)).toEqual(["BBBB", "CCCC", "AAAA"]);
    expect(brief.signalCount).toBe(2);
  });

  it("keeps a poorly fitting twin out of every ranking and says so", () => {
    const brief = buildBrief([
      row({ symbol: "GOOD" }),
      row({ symbol: "WEAK", fitQuality: 0.1, zScore: 5, realityVerdict: "contradiction" }),
    ]);
    expect(brief.covered).toBe(2);
    expect(brief.reliable).toBe(1);
    expect(brief.movers.map((r) => r.symbol)).toEqual(["GOOD"]);
    expect(brief.disagreements).toHaveLength(0);
    expect(brief.unreliable.map((r) => r.symbol)).toEqual(["WEAK"]);
  });

  it("lists only news and price disagreements, not confirmations", () => {
    const brief = buildBrief([
      row({ symbol: "AAAA", realityVerdict: "confirmed" }),
      row({ symbol: "BBBB", realityVerdict: "contradiction" }),
      row({ symbol: "CCCC", realityVerdict: "price_ahead_of_narrative" }),
    ]);
    expect(brief.disagreements.map((r) => r.symbol).sort()).toEqual(["BBBB", "CCCC"]);
  });

  it("lists only smart money divergences with enough conviction", () => {
    const brief = buildBrief([
      row({ symbol: "AAAA", smartMoneyType: "bullish_divergence", smartMoneyConviction: 70 }),
      row({ symbol: "BBBB", smartMoneyType: "bearish_divergence", smartMoneyConviction: 20 }),
      row({ symbol: "CCCC", smartMoneyType: "confirmation_up", smartMoneyConviction: 90 }),
    ]);
    expect(brief.smartMoney.map((r) => r.symbol)).toEqual(["AAAA"]);
  });

  it("averages a sector only when it has at least two stocks", () => {
    const brief = buildBrief([
      row({ symbol: "AAAA", sector: "Financials", idioReturn: 0.04 }),
      row({ symbol: "BBBB", sector: "Financials", idioReturn: 0.02 }),
      row({ symbol: "CCCC", sector: "Energy" }),
      row({ symbol: "DDDD", sector: null }),
    ]);
    expect(brief.sectors).toHaveLength(1);
    expect(brief.sectors[0].sector).toBe("Financials");
    expect(brief.sectors[0].avgIdio).toBeCloseTo(0.03, 10);
    expect(brief.singleStockSectors).toEqual(["Energy"]);
  });

  it("handles an empty day without inventing anything", () => {
    const brief = buildBrief([]);
    expect(brief.covered).toBe(0);
    expect(brief.movers).toEqual([]);
    expect(brief.sectors).toEqual([]);
  });
});
