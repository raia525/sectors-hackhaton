import type { CorporateActionItem } from "@/lib/analysis/corporate-actions";

/**
 * Upcoming corporate actions across several stocks, soonest first.
 *
 * Takes items already summarised for the viewer's own holding, so the rupiah
 * effect in each entry is theirs; the calendar itself only filters and orders.
 */

export const CALENDAR_DAYS = 14;

export interface CalendarEntry {
  symbol: string;
  item: CorporateActionItem;
}

export function buildCalendar(
  bySymbol: { symbol: string; items: CorporateActionItem[] }[],
  now: Date,
  days = CALENDAR_DAYS,
): CalendarEntry[] {
  const today = now.toISOString().slice(0, 10);
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const entries: CalendarEntry[] = [];
  for (const { symbol, items } of bySymbol) {
    for (const item of items) {
      // ISO dates compare correctly as strings.
      if (item.timing === "upcoming" && item.date >= today && item.date <= horizon) {
        entries.push({ symbol, item });
      }
    }
  }

  return entries.sort((a, b) =>
    a.item.date === b.item.date ? a.symbol.localeCompare(b.symbol) : a.item.date.localeCompare(b.item.date),
  );
}
