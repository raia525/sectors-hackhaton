/**
 * Calendar helpers pinned to Jakarta time.
 *
 * The scheduler and the server run in UTC, but a trading day is an IDX
 * trading day. Jakarta is UTC+7 all year with no daylight saving, so a fixed
 * offset is exact rather than an approximation.
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The Jakarta calendar date of an instant, as YYYY-MM-DD. */
export function jakartaDate(now: Date): string {
  return new Date(now.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Day of the week in Jakarta, 0 for Sunday through 6 for Saturday. */
export function jakartaWeekday(now: Date): number {
  return new Date(now.getTime() + JAKARTA_OFFSET_MS).getUTCDay();
}
