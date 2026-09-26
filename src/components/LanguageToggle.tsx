"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

/**
 * Language switch, sitting next to ThemeToggle.
 *
 * In its normal form, both options are always visible as a two-way pill: a
 * dropdown for a binary choice would add a click without adding clarity.
 *
 * `compact` collapses that pill to a single button showing only the active
 * language, for the header's minimized state where every extra pixel of
 * width matters. Clicking it expands a small menu with the other language;
 * choosing one, or clicking elsewhere, closes it again.
 */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compact || !open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [compact, open]);

  if (compact) {
    const other = LOCALES.find((code) => code !== locale) ?? locale;
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={t("language.label")}
          className="flex h-8 items-center rounded-full border border-border bg-surface px-2.5 text-[11px] font-bold uppercase text-text-subtle shadow-[var(--shadow-card)] transition-colors hover:text-text"
        >
          {locale}
        </button>
        {open ? (
          <div
            role="group"
            aria-label={t("language.label")}
            className="absolute right-0 top-full z-10 mt-1.5 overflow-hidden rounded-full border border-border bg-surface shadow-[var(--shadow-card)]"
          >
            <button
              type="button"
              onClick={() => {
                setLocale(other);
                setOpen(false);
              }}
              aria-label={LOCALE_LABELS[other]}
              className="h-8 whitespace-nowrap px-3 text-[11px] font-bold uppercase text-text-subtle transition-colors hover:bg-surface-raised hover:text-text"
            >
              {other}
            </button>
          </div>
        ) : null}
      </div>
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
