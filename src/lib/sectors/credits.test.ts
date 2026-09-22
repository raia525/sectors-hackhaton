import { describe, expect, it } from "vitest";
import { MemoryCreditLedger } from "./credits";

/**
 * The budget guard is the one piece of infrastructure whose failure is
 * unrecoverable: credits spent cannot be returned, and the hackathon allowance
 * is fixed. These tests pin the properties that keep it honest.
 */

describe("MemoryCreditLedger", () => {
  it("refuses a call that would breach the ceiling", async () => {
    const ledger = new MemoryCreditLedger(10, 0);
    expect(await ledger.tryConsume(9, "a")).toBe(true);
    expect(await ledger.tryConsume(2, "b")).toBe(false);
    expect(await ledger.spent()).toBe(9);
  });

  it("holds the reserve back from ordinary callers", async () => {
    const ledger = new MemoryCreditLedger(100, 40);
    // Only 60 is available to non-priority work.
    expect(await ledger.tryConsume(60, "background")).toBe(true);
    expect(await ledger.tryConsume(1, "background")).toBe(false);
  });

  it("lets priority callers draw on the reserve", async () => {
    const ledger = new MemoryCreditLedger(100, 40);
    await ledger.tryConsume(60, "background");
    expect(await ledger.tryConsume(30, "demo", true)).toBe(true);
  });

  it("never lets a priority caller exceed the hard limit", async () => {
    const ledger = new MemoryCreditLedger(100, 40);
    await ledger.tryConsume(60, "background");
    expect(await ledger.tryConsume(50, "demo", true)).toBe(false);
  });

  it("returns credits on refund without going negative", async () => {
    const ledger = new MemoryCreditLedger(100, 0);
    await ledger.tryConsume(10, "a");
    await ledger.refund(10);
    expect(await ledger.spent()).toBe(0);

    await ledger.refund(50);
    expect(await ledger.spent()).toBe(0);
  });

  it("treats a zero or negative cost as free", async () => {
    const ledger = new MemoryCreditLedger(1, 0);
    expect(await ledger.tryConsume(0, "free")).toBe(true);
    expect(await ledger.spent()).toBe(0);
  });

  it("reports remaining credits without going negative", async () => {
    const ledger = new MemoryCreditLedger(10, 0);
    await ledger.tryConsume(10, "a");
    expect(await ledger.remaining()).toBe(0);
  });

  it("attributes spending per endpoint for the budget view", async () => {
    const ledger = new MemoryCreditLedger(100, 0);
    await ledger.tryConsume(3, "/v2/company/report/");
    await ledger.tryConsume(1, "/v2/daily/");
    await ledger.tryConsume(2, "/v2/company/report/");

    const snap = ledger.snapshot();
    expect(snap.byLabel["/v2/company/report/"]).toBe(5);
    expect(snap.byLabel["/v2/daily/"]).toBe(1);
    expect(snap.spent).toBe(6);
    expect(snap.remaining).toBe(94);
  });

  it("rejects a reserve that would leave nothing spendable", () => {
    expect(() => new MemoryCreditLedger(100, 100)).toThrow(/smaller than/);
    expect(() => new MemoryCreditLedger(100, 150)).toThrow(/smaller than/);
  });
});
