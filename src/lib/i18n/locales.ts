/**
 * Supported interface languages.
 *
 * The language choice is a per-viewer display preference with no server-side
 * consequence, so it is stored in a cookie readable by both server and client
 * components rather than in the database: nothing else needs to know or
 * react to it, and a cookie survives a refresh without a round trip.
 */

export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "shadow-idx-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Indonesia",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "id";
}
