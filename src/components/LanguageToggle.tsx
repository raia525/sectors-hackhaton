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
      className="flex items-center rounded-full border border-border p-0.5 text-xs"
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
            className={`rounded-full px-2 py-1 font-medium uppercase transition-colors ${
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
