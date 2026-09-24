import "server-only";
import { cookies } from "next/headers";
import { translate, type FlatParams } from "./translate";
import { renderMessage, type Message } from "./message";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";
import type { TranslationKey } from "./dictionary";

/** Reads the viewer's chosen language from the cookie the client sets. */
export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

/**
 * Server-side translator bound to the current request's locale.
 *
 * Server components render before any client script runs, so they cannot
 * read the cookie reactively; they read it once per request instead, which is
 * exactly right for a value that does not change mid-render.
 */
export async function getTranslator(): Promise<{
  locale: Locale;
  t: (key: TranslationKey, params?: FlatParams) => string;
  /** Renders an engine-produced Message, resolving any nested translated word. */
  tm: (message: Message) => string;
}> {
  const locale = await getLocale();
  const t = (key: TranslationKey, params?: FlatParams) => translate(locale, key, params);
  return { locale, t, tm: (message) => renderMessage(message, t) };
}
