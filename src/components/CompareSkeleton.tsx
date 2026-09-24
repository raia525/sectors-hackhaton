"use client";

import { useTranslation } from "@/lib/i18n/client";

/**
 * Loading state shown while ComparisonResults builds twins for each symbol.
 *
 * A client component, not the async server component the surrounding page
 * uses elsewhere: a Suspense `fallback` must render synchronously, so it
 * cannot itself be an async component awaiting the server translator.
 */
export function CompareSkeleton({ count }: { count: number }) {
  const { t } = useTranslation();
  const label =
    count === 1 ? t("compare.stockLabelSingular") : t("compare.stockLabelPlural");

  return (
    <div aria-live="polite" aria-busy="true" className="space-y-3">
      <p className="text-sm text-text-muted">
        {t("compare.buildingTwins", { count, label })}
      </p>
      <div className="h-56 animate-pulse rounded-[10px] border border-border bg-surface" />
    </div>
  );
}
