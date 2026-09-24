/**
 * Pure number formatting, shared by engines (which embed a formatted figure
 * inside a translated sentence) and UI components alike.
 *
 * Kept dependency-free so analysis engines can import it without pulling in
 * anything React-related.
 */

/**
 * Abbreviates large rupiah figures, which routinely run to trillions.
 *
 * Small values are rounded to whole rupiah before formatting. Indonesian
 * notation uses the full stop as a thousands separator, so an unrounded 377.57
 * renders as "Rp 377,57" at best and is misread as 377 thousand at worst. No
 * IDX price or per-share figure needs sub-rupiah precision, so rounding removes
 * the ambiguity entirely.
 */
export function formatIdr(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(2)} T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(2)} Jt`;
  return `${sign}Rp ${Math.round(abs).toLocaleString("id-ID")}`;
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}
