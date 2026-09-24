"use client";

import { useTranslation } from "@/lib/i18n/client";

/**
 * Loading state shown while AnalysisView builds the twin for one symbol.
 *
 * Mirrors the shape of the finished page (four stat cards, the story, the
 * dark evidence panel) so the layout does not jump when the result arrives.
 *
 * A client component: a Suspense `fallback` must render synchronously, so it
 * cannot itself await the server translator.
 */
export function AnalysisSkeleton({ symbol }: { symbol: string }) {
  const { t } = useTranslation();
  const block = "animate-pulse rounded-[var(--radius)] border border-border bg-surface";

  return (
    <div aria-live="polite" aria-busy="true" className="space-y-6">
      <p className="text-sm font-semibold text-text-muted">
        {t("home.buildingTwin", { symbol: symbol.toUpperCase() })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-36 ${block}`} />
        ))}
      </div>
      <div className={`h-44 ${block}`} />
      <div className="ink h-[420px] animate-pulse rounded-[var(--radius-lg)]" />
    </div>
  );
}
