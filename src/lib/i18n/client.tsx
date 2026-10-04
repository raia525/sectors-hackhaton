"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { translate, type FlatParams, type Overrides } from "./translate";
import { renderMessage, type Message } from "./message";
import { LOCALE_COOKIE, type Locale } from "./locales";
import type { TranslationKey } from "./dictionary";
import { syncLocalePreference } from "@/app/actions/locale";

/**
 * Client-side language context.
 *
 * Initialised from the server-rendered locale (passed as a prop from the root
 * layout, itself read from the cookie) so the first client render matches the
 * server output exactly. Switching language updates the cookie and this
 * context immediately, and also calls router.refresh(): every page here has
 * server components (the search results, the analysis view, static page
 * copy) that read the cookie via getTranslator() at request time, and those
 * would otherwise keep showing the old language until the next real
 * navigation. The refresh re-runs them against the new cookie without a full
 * page reload or losing client-side state such as form input.
 */

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, params?: FlatParams) => string;
  /** Renders an engine-produced Message, resolving any nested translated word. */
  tm: (message: Message) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  overrides,
  children,
}: {
  initialLocale: Locale;
  /** Edited landing copy, for both languages so a switch needs no refetch. */
  overrides: Record<Locale, Overrides>;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Mirrors onto the account for a signed-in user, so a scheduled alert with
      // no cookie to read still lands in the language they chose. A no-op for
      // an anonymous visitor.
      void syncLocalePreference(next);
      // Re-renders server components against the new cookie; see the module
      // comment above for why this is necessary.
      router.refresh();
    },
    [router],
  );

  const t = useCallback(
    (key: TranslationKey, params?: FlatParams) => translate(locale, key, params, overrides[locale]),
    [locale, overrides],
  );

  const tm = useCallback((message: Message) => renderMessage(message, t), [t]);

  const value = useMemo(() => ({ locale, t, tm, setLocale }), [locale, t, tm, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Adds strings to the translator for one part of the page. They arrive as a
 * prop in that page's own server response rather than in the shared bundle
 * (see AGENTS.md).
 */
export function I18nExtension({
  messages,
  children,
}: {
  messages: Record<Locale, Overrides>;
  children: React.ReactNode;
}) {
  const parent = useContext(I18nContext);
  if (!parent) throw new Error("I18nExtension must be used inside I18nProvider.");
  const { locale, setLocale } = parent;
  const parentT = parent.t;

  const t = useCallback(
    (key: TranslationKey, params?: FlatParams) =>
      messages[locale][key] !== undefined ? translate(locale, key, params, messages[locale]) : parentT(key, params),
    [locale, messages, parentT],
  );
  const tm = useCallback((message: Message) => renderMessage(message, t), [t]);
  const value = useMemo(() => ({ locale, t, tm, setLocale }), [locale, t, tm, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Reads the current language and translator.
 *
 * Throws when used outside I18nProvider rather than silently falling back:
 * a component rendering untranslated keys is a bug worth surfacing immediately
 * during development, not a degraded state to render gracefully in production.
 */
export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider.");
  }
  return ctx;
}
