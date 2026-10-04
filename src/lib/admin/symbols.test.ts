import { describe, expect, it } from "vitest";
import { bulkAddMessage, DEFAULT_STRIP, MAX_BULK, moveTo, parseSymbolList } from "./symbols";

describe("parseSymbolList", () => {
  it("reads codes in any common separator, once each, in order", () => {
    expect(parseSymbolList("bbri, BBCA;tlkm\nBBRI.JK  asii")).toEqual({
      symbols: ["BBRI", "BBCA", "TLKM", "ASII"],
      invalid: [],
      tooMany: false,
    });
  });

  it("reports what is not a code instead of dropping it silently", () => {
    expect(parseSymbolList("BBRI, BANKBRI, 1234")).toMatchObject({ symbols: ["BBRI"], invalid: ["BANKBRI", "1234"] });
    expect(parseSymbolList("   ").symbols).toEqual([]);
  });

  it("caps one paste", () => {
    const many = Array.from({ length: MAX_BULK + 5 }, (_, i) => `A${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}A`);
    const result = parseSymbolList(many.join(","));
    expect(result.symbols).toHaveLength(MAX_BULK);
    expect(result.tooMany).toBe(true);
  });
});

describe("moveTo", () => {
  const order = ["A", "B", "C", "D"];

  it("moves to a 1-based position", () => {
    expect(moveTo(order, "D", 1)).toEqual(["D", "A", "B", "C"]);
    expect(moveTo(order, "A", 3)).toEqual(["B", "C", "A", "D"]);
  });

  it("clamps out of range positions and ignores unknown codes", () => {
    expect(moveTo(order, "B", 99)).toEqual(["A", "C", "D", "B"]);
    expect(moveTo(order, "C", -4)).toEqual(["C", "A", "B", "D"]);
    expect(moveTo(order, "Z", 1)).toBe(order);
    expect(moveTo(order, "A", Number.NaN)).toBe(order);
  });
});

describe("bulkAddMessage", () => {
  it("picks one sentence for each outcome", () => {
    expect(bulkAddMessage({ added: 2, alreadyListed: 1, invalid: [], tooMany: false }).key).toBe("admin.list.added");
    expect(bulkAddMessage({ added: 2, alreadyListed: 0, invalid: ["X1"], tooMany: false })).toMatchObject({
      key: "admin.list.addedInvalid",
      params: { invalid: "X1" },
    });
    expect(bulkAddMessage({ added: 100, alreadyListed: 0, invalid: [], tooMany: true }).key).toBe("admin.list.addedCapped");
  });
});

it("ships a valid default strip", () => {
  expect(parseSymbolList(DEFAULT_STRIP.join(",")).symbols).toEqual(DEFAULT_STRIP);
});
