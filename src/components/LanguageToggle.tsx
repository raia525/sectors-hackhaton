"use client";

import { useTranslation } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

/**
 * Language switch, sitting next to ThemeToggle.
 *
 * Both options are normally visible as a two-way pill: a dropdown for a
 * binary choice would add a click without adding clarity.
 *
 * `floating` is the header's floating form: the same pill, smaller and
 * without its own border, so it sits flush inside the header pill.
 *
 * `collapsed` is the minimized header's form: the inactive option shrinks
 * away and the active one remains as a single button that switches to the
 * other language when clicked. It collapses rather than being removed, so
 * the change animates with the rest of the header instead of jumping.
 */
export function LanguageToggle({
  floating = false,
  collapsed = false,
}: {
  floating?: boolean;
  collapsed?: boolean;
}) {
  const { locale, setLocale, t } = useTranslation();
  const other = LOCALES.find((code) => code !== locale) ?? locale;

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={`nav-anim flex items-center rounded-full text-xs ${
        floating
          ? "h-8 p-0"
          : "h-10 border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
      }`}
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        const hidden = collapsed && !active;
        return (
          <button
            key={code}
            type="button"
            // With only the active option showing, clicking it is the way to
            // reach the other language.
            onClick={() => setLocale(collapsed ? other : code)}
            aria-pressed={active}
            aria-label={LOCALE_LABELS[collapsed ? other : code]}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : undefined}
            className={`nav-anim h-full overflow-hidden whitespace-nowrap rounded-full font-bold uppercase ${
              hidden ? "max-w-0 px-0 opacity-0" : "max-w-16 px-3 opacity-100"
            } ${
              // Floating, the current page is already the orange pill beside
              // this one; a second orange fill next to it would read as one
              // blob, so the active language takes a quieter fill instead.
              active && !collapsed
                ? floating
                  ? "bg-surface-raised text-text"
                  : "bg-accent text-accent-contrast"
                : "text-text-muted hover:bg-surface-raised hover:text-text"
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
