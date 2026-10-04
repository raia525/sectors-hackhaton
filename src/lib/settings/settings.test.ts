import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseAll, parseGroup, validateGroup } from "./app";
import { DEFAULT_PREFERENCES, parsePreferences } from "./user";
import { SHIPPED_BARS } from "@/lib/intelligence/track-record";

describe("app settings", () => {
  it("falls back to the shipped behaviour with no rows", () => {
    expect(DEFAULT_SETTINGS.signals).toEqual(SHIPPED_BARS);
    expect(DEFAULT_SETTINGS.run).toEqual({ enabled: true, creditCap: null, watchedFirst: true });
    expect(DEFAULT_SETTINGS.chat.model).toBe("grok-4.3");
    expect(DEFAULT_SETTINGS.strip.speed).toBe("normal");
  });

  it("fills fields an older stored row does not have", () => {
    expect(parseGroup("chat", { dailyLimit: 5 })).toMatchObject({ dailyLimit: 5, enabled: true, model: "grok-4.3" });
  });

  it("drops a whole invalid group back to its defaults rather than half applying it", () => {
    const parsed = parseAll([{ key: "signals", value: { signalZ: 1, fitFloor: 0.9 } }]);
    expect(parsed.signals).toEqual(SHIPPED_BARS);
  });

  it("refuses signal bars looser than the shipped ones", () => {
    expect(validateGroup("signals", { signalZ: 1.5, fitFloor: 0.3, minPeers: 3 })).toEqual({ ok: false, fields: ["signalZ"] });
    expect(validateGroup("signals", { signalZ: 2, fitFloor: 0.2, minPeers: 2 })).toMatchObject({
      ok: false,
      fields: ["fitFloor", "minPeers"],
    });
    expect(validateGroup("signals", { signalZ: 2.5, fitFloor: 0.4, minPeers: 4 })).toEqual({
      ok: true,
      value: { signalZ: 2.5, fitFloor: 0.4, minPeers: 4 },
    });
  });

  it("refuses an odd model id and an em dash in the instructions", () => {
    expect(validateGroup("chat", { model: "grok 4; rm -rf" }).ok).toBe(false);
    expect(validateGroup("chat", { extraInstructions: "Be brief — always" }).ok).toBe(false);
    expect(validateGroup("chat", { model: "grok-4.7", extraInstructions: "Be brief." }).ok).toBe(true);
  });

  it("bounds the credit cap", () => {
    expect(validateGroup("run", { creditCap: 5000 }).ok).toBe(false);
    expect(validateGroup("run", { creditCap: null, enabled: false })).toMatchObject({ ok: true });
  });
});

describe("user preferences", () => {
  it("defaults to every panel in the shipped order", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.panels).toEqual(["keyStats", "corporateActions", "seasonality", "smartMoney"]);
    expect(DEFAULT_PREFERENCES.homeTab).toBe("market");
  });

  it("keeps a chosen order, dropping duplicates", () => {
    expect(parsePreferences({ panels: ["smartMoney", "keyStats", "smartMoney"] }).panels).toEqual(["smartMoney", "keyStats"]);
  });

  it("falls back on unknown panels or out of range values", () => {
    expect(parsePreferences({ panels: ["chart"] })).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ defaultThreshold: 9 })).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("garbage")).toEqual(DEFAULT_PREFERENCES);
  });
});
