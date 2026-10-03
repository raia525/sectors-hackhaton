/**
 * Brand palettes: validation, the CSS they render to, and a contrast check.
 *
 * A palette is written into a <style> tag on every page, so a value that is
 * not exactly `#rrggbb` is refused outright rather than escaped: a colour has
 * no legitimate reason to contain anything else, and that rules out CSS
 * injection by construction.
 */

export const PALETTE_FIELDS = [
  "lightAccent",
  "lightAccentHover",
  "lightAccentBright",
  "lightAccentSoft",
  "darkAccent",
  "darkAccentHover",
  "darkAccentBright",
  "darkAccentSoft",
] as const;

export type PaletteField = (typeof PALETTE_FIELDS)[number];
export type PaletteColours = Record<PaletteField, string>;

/** The built-in palette, matching the defaults in globals.css. */
export const DEFAULT_PALETTE: PaletteColours = {
  lightAccent: "#ea580c",
  lightAccentHover: "#c2410c",
  lightAccentBright: "#ff6a1a",
  lightAccentSoft: "#fff0e6",
  darkAccent: "#fb7a2e",
  darkAccentHover: "#fd9a5c",
  darkAccentBright: "#ff8a3d",
  darkAccentSoft: "#3a1f0e",
};

export function isHexColour(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** The CSS for a palette, or null if any value is not a plain hex colour. */
export function paletteCss(palette: PaletteColours): string | null {
  if (!PALETTE_FIELDS.every((field) => isHexColour(palette[field]))) return null;
  const p = palette;
  return (
    `:root{--accent:${p.lightAccent};--accent-hover:${p.lightAccentHover};` +
    `--accent-bright:${p.lightAccentBright};--accent-soft:${p.lightAccentSoft}}` +
    `:root[data-theme="dark"]{--accent:${p.darkAccent};--accent-hover:${p.darkAccentHover};` +
    `--accent-bright:${p.darkAccentBright};--accent-soft:${p.darkAccentSoft}}`
  );
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Buttons put white text on the accent. Below 3:1 (the WCAG minimum for
 * large, bold text) that text becomes hard to read, so the admin page warns.
 * A warning rather than a refusal: the admin may have a reason.
 */
export const MIN_BUTTON_CONTRAST = 3;
