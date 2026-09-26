"use client";

import { useTranslation } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

/**
 * Language switch, sitting next to ThemeToggle.
 *
 * In its normal form, both options are always visible as a two-way pill: a
 * dropdown for a binary choice would add a click without adding clarity.
 *
 * `compact` is the minimized header's form: one borderless button showing
 * the active language, which switches to the other one when clicked. With
 * exactly two languages a single click is the whole choice, so it needs no
 * menu of its own sticking out of the header.
 */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useTranslation();

  if (compact) {
    const other = LOCALES.find((code) => code !== locale) ?? locale;
    return (
      <button
        type="button"
        onClick={() => setLocale(other)}
        aria-label={`${t("language.label")}: ${LOCALE_LABELS[locale]}. ${LOCALE_LABELS[other]}`}
        className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-bold uppercase text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
      >
        {locale}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="flex h-10 items-center rounded-full border border-border bg-surface p-1 text-xs shadow-[var(--shadow-card)]"
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={LOCALE_LABELS[code]}
            className={`h-full rounded-full px-3 font-bold uppercase transition-colors ${
              active ? "bg-accent text-accent-contrast" : "text-text-subtle hover:text-text"
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
