import { describe, expect, it } from "vitest";
import {
  SHARES_PER_LOT,
  summarizeCorporateActions,
  upcomingIncome,
} from "./corporate-actions";

const TODAY = new Date("2025-06-15T00:00:00Z");

function payload(over: Record<string, unknown> = {}) {
  return {
    symbol: "BBRI.JK",
    corporate_actions: {
      agm: null,
      bonus: null,
      warrant: null,
      dividend: null,
      right_issue: null,
      stock_split: null,
      upcoming_dividend: null,
      ...over,
    },
  };
}

describe("summarizeCorporateActions", () => {
  it("converts a dividend into cash for the holder's position", () => {
    const items = summarizeCorporateActions(
      payload({
        dividend: [
          {
            ex_date: "2025-07-01",
            payment_date: "2025-07-20",
            dividend_amount: 135,
            dividend_yield: 0.042,
          },
        ],
      }),
      { lots: 10, avgPrice: 4500 },
      TODAY,
    );

    expect(items).toHaveLength(1);
    // 10 lots = 1000 shares at Rp135 each.
    expect(items[0].effect?.cashIdr).toBe(10 * SHARES_PER_LOT * 135);
    expect(items[0].timing).toBe("upcoming");
  });

  it("reports no position effect when the user holds nothing", () => {
    const items = summarizeCorporateActions(
      payload({
        dividend: [
          { ex_date: "2025-07-01", payment_date: "2025-07-20", dividend_amount: 135, dividend_yield: 0.04 },
        ],
      }),
      null,
      TODAY,
    );
    expect(items[0].effect).toBeNull();
  });

  it("adjusts share count and cost basis in opposite directions for a split", () => {
    // The position's total value must not change; a split creates no value.
    const items = summarizeCorporateActions(
      payload({ stock_split: [{ date: "2025-08-01", split_ratio: 5 }] }),
      { lots: 10, avgPrice: 5000 },
      TODAY,
    );

    const effect = items[0].effect!;
    expect(effect.sharesAfter).toBe(5000);
    expect(effect.adjustedAvgPrice).toBe(1000);
    expect(effect.sharesAfter! * effect.adjustedAvgPrice!).toBe(
      10 * SHARES_PER_LOT * 5000,
    );
  });

  it("labels a reverse split correctly", () => {
    const items = summarizeCorporateActions(
      payload({ stock_split: [{ date: "2025-08-01", split_ratio: 0.25 }] }),
      null,
      TODAY,
    );
    expect(items[0].summary).toMatch(/Reverse split, 1:4/);
  });

  it("separates upcoming from recent events", () => {
    const items = summarizeCorporateActions(
      payload({
        dividend: [
          { ex_date: "2025-01-01", payment_date: "2025-01-20", dividend_amount: 100, dividend_yield: 0.03 },
          { ex_date: "2025-09-01", payment_date: "2025-09-20", dividend_amount: 120, dividend_yield: 0.04 },
        ],
      }),
      null,
      TODAY,
    );

    // Upcoming sorts first so the holder sees what they can still act on.
    expect(items[0].timing).toBe("upcoming");
    expect(items[1].timing).toBe("recent");
  });

  it("returns an empty list for a malformed response", () => {
    expect(summarizeCorporateActions({ nonsense: true }, null, TODAY)).toEqual([]);
    expect(summarizeCorporateActions(null, null, TODAY)).toEqual([]);
  });

  it("skips entries missing the fields needed to describe them", () => {
    const items = summarizeCorporateActions(
      payload({
        dividend: [{ ex_date: null, payment_date: null, dividend_amount: 100, dividend_yield: null }],
        stock_split: [{ date: "2025-08-01", split_ratio: null }],
      }),
      null,
      TODAY,
    );
    expect(items).toEqual([]);
  });

  it("totals only upcoming dividend income", () => {
    const items = summarizeCorporateActions(
      payload({
        dividend: [
          { ex_date: "2025-01-01", payment_date: "2025-01-20", dividend_amount: 100, dividend_yield: 0.03 },
          { ex_date: "2025-09-01", payment_date: "2025-09-20", dividend_amount: 120, dividend_yield: 0.04 },
        ],
      }),
      { lots: 5, avgPrice: 4000 },
      TODAY,
    );

    expect(upcomingIncome(items)).toBe(5 * SHARES_PER_LOT * 120);
  });
});
