import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { msg, type Message } from "@/lib/i18n/message";

/**
 * Pure helpers for the admin's ordered stock lists (the daily universe and
 * the landing ticker strip).
 */

/** Most codes accepted in one paste. A typo should not queue 900 stocks. */
export const MAX_BULK = 100;

/**
 * Reads a pasted list: codes separated by commas, spaces, semicolons or new
 * lines, with or without ".JK". Valid codes come back once each, in the
 * order given; anything that is not a four letter code is reported back
 * rather than silently dropped.
 */
export function parseSymbolList(raw: string): { symbols: string[]; invalid: string[]; tooMany: boolean } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const symbols: string[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const symbol = normalizeSymbol(token);
    if (!symbol) invalid.push(token.slice(0, 12));
    else if (!symbols.includes(symbol)) symbols.push(symbol);
  }
  return { symbols: symbols.slice(0, MAX_BULK), invalid, tooMany: symbols.length > MAX_BULK };
}

/**
 * Moves one symbol to a 1-based position, clamped to the list, and returns
 * the new order. Unknown symbols leave the list unchanged.
 */
export function moveTo(order: string[], symbol: string, position: number): string[] {
  const from = order.indexOf(symbol);
  if (from < 0 || !Number.isFinite(position)) return order;
  const to = Math.min(Math.max(Math.round(position), 1), order.length) - 1;
  const next = order.filter((s) => s !== symbol);
  next.splice(to, 0, symbol);
  return next;
}

/** The landing ticker strip when the admin has not set one. */
export const DEFAULT_STRIP = [
  "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "UNVR", "ICBP", "INDF", "GOTO",
  "ADRO", "ANTM", "PGAS", "PTBA", "KLBF", "CPIN", "UNTR", "AMRT", "MDKA", "INCO",
  "ISAT", "BRIS",
];

/** One sentence describing a bulk add, naming what was skipped and why. */
export function bulkAddMessage(r: { added: number; alreadyListed: number; invalid: string[]; tooMany: boolean }): Message {
  if (r.tooMany) return msg("admin.list.addedCapped", { added: r.added, max: MAX_BULK });
  if (r.invalid.length > 0) {
    return msg("admin.list.addedInvalid", { added: r.added, skipped: r.alreadyListed, invalid: r.invalid.join(", ") });
  }
  return msg("admin.list.added", { added: r.added, skipped: r.alreadyListed });
}
