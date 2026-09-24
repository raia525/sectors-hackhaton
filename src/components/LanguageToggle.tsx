"use client";

import { useTranslation } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

/**
 * Language switch, sitting next to ThemeToggle.
 *
 * A two-way pill rather than a dropdown: there are exactly two languages, and
 * a dropdown for a binary choice adds a click without adding clarity. Both
 * options are always visible, so the current choice is legible at a glance.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

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
              active
                ? "bg-accent text-accent-contrast"
                : "text-text-subtle hover:text-text"
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
