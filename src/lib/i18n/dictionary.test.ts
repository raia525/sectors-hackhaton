import { describe, expect, it } from "vitest";
import { en, id } from "./dictionary";
import { translate } from "./translate";

/**
 * These tests guard the two properties that make the dictionary trustworthy:
 * every key exists in both languages, and neither language accidentally
 * claims something the underlying data cannot support.
 */

describe("dictionary completeness", () => {
  it("has an Indonesian entry for every English key", () => {
    const missing = Object.keys(en).filter((key) => !(key in id));
    expect(missing).toEqual([]);
  });

  it("has no Indonesian entry without an English source", () => {
    const orphaned = Object.keys(id).filter((key) => !(key in en));
    expect(orphaned).toEqual([]);
  });

  it("has no empty translation in either language", () => {
    const empties = Object.entries({ ...en, ...id })
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(empties).toEqual([]);
  });
});

describe("dictionary claims", () => {
  it("never describes smart money positioning as insider activity", () => {
    // The Sectors API has no director-level dealings; the smart money module
    // is scoped to foreign flow and institutional ownership categories only.
    // Claiming otherwise, in either language, would be a claim the data
    // cannot support.
    const smartMoneyEntries = Object.entries({ ...en, ...id }).filter(([key]) =>
      key.startsWith("smartmoney."),
    );
    for (const [key, value] of smartMoneyEntries) {
      expect(value.toLowerCase(), `key "${key}" mentions insider`).not.toMatch(
        /insider/,
      );
    }
  });

  it("carries the investment-advice disclaimer in both languages", () => {
    expect(translate("en", "reality.caveat.notAdvice")).toMatch(
      /not investment advice/i,
    );
    expect(translate("id", "reality.caveat.notAdvice")).toMatch(
      /bukan saran investasi/i,
    );
  });
});

describe("translate", () => {
  it("interpolates named parameters", () => {
    expect(translate("en", "search.moreResults", { count: 12 })).toBe(
      "12 more, keep typing to narrow it down",
    );
  });

  it("renders every key in both languages without throwing", () => {
    // A cheap smoke test that both dictionaries are structurally sound: every
    // English key resolves to a non-empty string in each locale.
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(translate("en", key)).toBeTruthy();
      expect(translate("id", key)).toBeTruthy();
    }
  });
});
