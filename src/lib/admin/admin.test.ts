import { describe, expect, it } from "vitest";
import { checkOverride, EDITABLE_KEYS, isEditableKey, placeholders } from "./content";
import { contrastRatio, DEFAULT_PALETTE, isHexColour, paletteCss } from "./palette";
import { checkUpload, MAX_UPLOAD_BYTES, sniffImageType, svgIsSafe } from "./upload";
import { translate } from "@/lib/i18n/translate";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => new TextEncoder().encode(s);

describe("editable landing keys", () => {
  it("allows landing copy and refuses engine text", () => {
    expect(EDITABLE_KEYS.length).toBeGreaterThan(20);
    expect(isEditableKey("landing.titleLead")).toBe(true);
    expect(isEditableKey("home.description")).toBe(true);
    expect(isEditableKey("brand.tagline")).toBe(true);
    expect(isEditableKey("shadow.warning.weakFit")).toBe(false);
    expect(isEditableKey("not.a.key")).toBe(false);
  });

  it("lists placeholders once, in order", () => {
    expect(placeholders("{b} and {a} and {b}")).toEqual(["a", "b"]);
    expect(placeholders("none here")).toEqual([]);
  });
});

describe("checkOverride", () => {
  it("accepts a trimmed value that keeps every placeholder", () => {
    expect(checkOverride("landing.tickerCount", "  {count} tickers  ")).toEqual({
      ok: true,
      value: "{count} tickers",
    });
  });

  it("refuses a value that drops a placeholder", () => {
    expect(checkOverride("landing.tickerCount", "Lots of tickers")).toEqual({
      ok: false,
      problem: "placeholders",
      missing: ["count"],
    });
  });

  it("refuses empty, overlong and em dash values", () => {
    expect(checkOverride("landing.titleLead", "   ")).toMatchObject({ problem: "empty" });
    expect(checkOverride("landing.titleLead", "x".repeat(601))).toMatchObject({ problem: "tooLong" });
    expect(checkOverride("landing.titleLead", "Every stock — a shadow")).toMatchObject({
      problem: "emDash",
    });
  });
});

describe("translate with overrides", () => {
  it("prefers the override, then interpolates it", () => {
    expect(translate("en", "landing.tickerCount", { count: 5 }, { "landing.tickerCount": "{count} stocks" })).toBe(
      "5 stocks",
    );
  });

  it("falls back to the dictionary when no override exists", () => {
    expect(translate("en", "landing.titleLead", undefined, {})).toBe("Every stock has a");
  });
});

describe("palette", () => {
  it("accepts only #rrggbb colours", () => {
    expect(isHexColour("#ff6a1a")).toBe(true);
    expect(isHexColour("#FF6A1A")).toBe(true);
    expect(isHexColour("#fff")).toBe(false);
    expect(isHexColour("red")).toBe(false);
    expect(isHexColour("#ff6a1a;}body{display:none")).toBe(false);
  });

  it("renders light and dark variables, and refuses any invalid value", () => {
    const css = paletteCss(DEFAULT_PALETTE);
    expect(css).toContain("--accent-bright:#ff6a1a");
    expect(css).toContain(':root[data-theme="dark"]{--accent:#fb7a2e');
    expect(paletteCss({ ...DEFAULT_PALETTE, darkAccent: "#000;}*{color:red" })).toBeNull();
  });

  it("measures contrast the WCAG way", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("uploads", () => {
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);

  it("reads the type from the file itself", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 1, 0, 1, 0))).toBe("image/x-icon");
    expect(sniffImageType(text('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(
      "image/svg+xml",
    );
    expect(sniffImageType(text("<html><body>not an image</body></html>"))).toBeNull();
  });

  it("refuses SVG that can run script or fetch anything", () => {
    expect(svgIsSafe('<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>')).toBe(true);
    expect(svgIsSafe('<svg><use href="#a"/><rect fill="url(#g)"/></svg>')).toBe(true);
    expect(svgIsSafe("<svg><script>alert(1)</script></svg>")).toBe(false);
    expect(svgIsSafe('<svg onload="alert(1)"></svg>')).toBe(false);
    expect(svgIsSafe('<svg><a href="javascript:alert(1)">x</a></svg>')).toBe(false);
    expect(svgIsSafe('<svg><image href="https://evil.example/x.png"/></svg>')).toBe(false);
    expect(svgIsSafe("<svg><foreignObject></foreignObject></svg>")).toBe(false);
    expect(svgIsSafe('<svg><rect style="fill:url(https://evil.example/a)"/></svg>')).toBe(false);
  });

  it("enforces size, kind and safety together", () => {
    expect(checkUpload(new Uint8Array(0), "LOGO")).toEqual({ ok: false, problem: "empty" });
    expect(checkUpload(new Uint8Array(MAX_UPLOAD_BYTES + 1), "LOGO")).toEqual({ ok: false, problem: "tooLarge" });
    expect(checkUpload(png, "LOGO")).toEqual({ ok: true, mimeType: "image/png" });
    // An .ico is a favicon format, not a logo format.
    expect(checkUpload(bytes(0, 0, 1, 0, 1, 0), "LOGO")).toEqual({ ok: false, problem: "unsupported" });
    expect(checkUpload(text("<svg><script>x</script></svg>"), "FAVICON")).toEqual({
      ok: false,
      problem: "unsafeSvg",
    });
  });
});

import { formatWib, parseWib, scheduleStatus } from "./schedule";

describe("announcement schedule", () => {
  it("reads and writes times in Jakarta time", () => {
    const date = parseWib("2026-10-03T09:00");
    expect(date?.toISOString()).toBe("2026-10-03T02:00:00.000Z");
    expect(formatWib(date)).toBe("2026-10-03T09:00");
    expect(parseWib("")).toBeNull();
    expect(parseWib("tomorrow")).toBeNull();
    expect(formatWib(null)).toBe("");
  });

  it("classifies an announcement against now", () => {
    const now = new Date("2026-10-03T05:00:00Z");
    const base = { isActive: true, startsAt: null, endsAt: null };
    expect(scheduleStatus(base, now)).toBe("live");
    expect(scheduleStatus({ ...base, isActive: false }, now)).toBe("off");
    expect(scheduleStatus({ ...base, startsAt: new Date("2026-10-04T00:00:00Z") }, now)).toBe("scheduled");
    expect(scheduleStatus({ ...base, endsAt: new Date("2026-10-02T00:00:00Z") }, now)).toBe("ended");
  });
});
