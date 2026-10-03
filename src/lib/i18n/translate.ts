import { en, id, type TranslationKey } from "./dictionary";
import type { Locale } from "./locales";

/**
 * Core interpolation function, shared by the server and client translators.
 *
 * Takes only flat, already-resolved values. Nested translated parameters
 * (see message.ts's renderMessage) are resolved before reaching here, so this
 * function stays a simple, locale-agnostic string substitution.
 *
 * A missing key falls back to the English string rather than throwing or
 * rendering nothing: a translation gap should degrade to readable English,
 * never to a blank label or a crashed page.
 */

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { en, id };

export type FlatParams = Record<string, string | number>;

/** Admin edits for one language, keyed by translation key (see src/lib/admin/content.ts). */
export type Overrides = Partial<Record<string, string>>;

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: FlatParams,
  overrides?: Overrides,
): string {
  const template = overrides?.[key] ?? DICTIONARIES[locale][key] ?? DICTIONARIES.en[key] ?? key;
  if (!params) return template;

  let result = template;
  for (const [name, value] of Object.entries(params)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }
  return result;
}
