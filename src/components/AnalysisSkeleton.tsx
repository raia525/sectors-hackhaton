"use client";

import { useTranslation } from "@/lib/i18n/client";

/**
 * Loading state shown while AnalysisView builds the twin for one symbol.
 *
 * A client component: a Suspense `fallback` must render synchronously, so it
 * cannot itself await the server translator.
 */
export function AnalysisSkeleton({ symbol }: { symbol: string }) {
  const { t } = useTranslation();

  return (
    <div aria-live="polite" aria-busy="true" className="space-y-4">
      <p className="text-sm text-text-muted">
        {t("home.buildingTwin", { symbol: symbol.toUpperCase() })}
      </p>
      <div className="h-64 animate-pulse rounded-[10px] border border-border bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-[10px] border border-border bg-surface" />
        <div className="h-40 animate-pulse rounded-[10px] border border-border bg-surface" />
      </div>
    </div>
  );
}
