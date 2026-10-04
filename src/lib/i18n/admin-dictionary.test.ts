import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { adminEn, adminId } = await import("./admin-dictionary");
const { en } = await import("./dictionary");

/**
 * The admin copy is kept out of the public dictionary so a regular visitor's
 * browser never receives it. These tests hold both halves of that: the admin
 * dictionary is complete, and nothing about the panel leaks back into the
 * public one.
 */
describe("admin dictionary", () => {
  it("has every key in both languages", () => {
    expect(Object.keys(adminEn).sort()).toEqual(Object.keys(adminId).sort());
  });

  it("keeps placeholders matched and uses no em dash", () => {
    const ph = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",");
    for (const [key, value] of Object.entries(adminEn)) {
      const translated = adminId[key as keyof typeof adminEn];
      expect(ph(translated), key).toBe(ph(value));
      expect(value + translated, key).not.toContain("—");
    }
  });

  it("leaves no admin key or admin panel wording in the public dictionary", () => {
    const publicKeys = Object.keys(en);
    expect(publicKeys.filter((k) => k.startsWith("admin."))).toEqual([]);
    expect(Object.keys(adminEn).filter((k) => publicKeys.includes(k))).toEqual([]);
    // Any mention at all would tell a regular visitor the role exists.
    expect(Object.entries(en).filter(([k, v]) => /admin/i.test(k + v)).map(([k]) => k)).toEqual([]);
  });
});
