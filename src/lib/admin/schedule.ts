/**
 * Announcement schedule times, entered and shown in Jakarta time (WIB).
 *
 * A datetime-local field carries no time zone, and the server runs in UTC,
 * so the admin's "09:00" would otherwise be read as 09:00 UTC, seven hours
 * late. WIB is UTC+7 all year, so a fixed offset is exact.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** "2026-10-03T09:00" in WIB, as an instant. Null for blank or malformed input. */
export function parseWib(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An instant as a datetime-local value in WIB. */
export function formatWib(date: Date | null): string {
  return date ? new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 16) : "";
}

export type ScheduleStatus = "live" | "scheduled" | "ended" | "off";

export function scheduleStatus(
  a: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): ScheduleStatus {
  if (!a.isActive) return "off";
  if (a.startsAt && a.startsAt > now) return "scheduled";
  if (a.endsAt && a.endsAt < now) return "ended";
  return "live";
}
