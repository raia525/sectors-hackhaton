"use client";

import { useTranslation } from "@/lib/i18n/client";

/** First focusable element on the page, so it needs its own translated label. */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
    >
      {t("nav.skipToContent")}
    </a>
  );
}
