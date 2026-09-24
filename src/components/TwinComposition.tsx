"use client";

import type { ShadowConstituent } from "@/lib/shadow/types";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * The stocks making up the synthetic twin, with their weights and the reason
 * each one qualified.
 *
 * This panel is what separates the product from a black box. A user who
 * disagrees with a divergence figure can see exactly which companies produced
 * it and on which dimensions they matched, and dismiss the result if the peer
 * set looks wrong to them. An opaque score would have to be taken on trust.
 */

const DIMENSION_KEY: Record<string, TranslationKey> = {
  correlation: "twin.dimension.correlation",
  sector: "twin.dimension.sector",
  marketCap: "twin.dimension.marketCap",
  volatility: "twin.dimension.volatility",
  growth: "twin.dimension.growth",
  dividend: "twin.dimension.dividend",
};

export function TwinComposition({
  constituents,
}: {
  constituents: ShadowConstituent[];
}) {
  const { t } = useTranslation();

  if (constituents.length === 0) {
    return <p className="text-sm text-text-muted">{t("twin.noneQualified")}</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {constituents.map((c) => (
          <li key={c.symbol}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <span className="text-sm font-medium text-text">{c.symbol}</span>
                <span className="ml-2 truncate text-xs text-text-subtle">
                  {c.companyName}
                </span>
              </div>
              <span className="tnum shrink-0 text-sm text-text-muted">
                {(c.weight * 100).toFixed(1)}%
              </span>
            </div>

            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"
              role="img"
              aria-label={t("twin.constituentAriaLabel", {
                symbol: c.symbol,
                weightPct: (c.weight * 100).toFixed(1),
                similarityPct: (c.similarity * 100).toFixed(0),
              })}
            >
              <div
                aria-hidden
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(c.weight * 100, 1.5)}%` }}
              />
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-subtle">
              <span>{t("twin.similarity", { value: `${(c.similarity * 100).toFixed(0)}%` })}</span>
              <span>{t("twin.correlation", { value: c.correlation.toFixed(2) })}</span>
              {topDimensions(c).map((d) => (
                <span key={d}>{t(DIMENSION_KEY[d] ?? "twin.dimension.correlation")}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-text-subtle">{t("twin.weightFootnote")}</p>
    </div>
  );
}

/** The dimensions on which this peer matched most strongly. */
function topDimensions(c: ShadowConstituent, limit = 2): string[] {
  return Object.entries(c.components)
    .filter(([, v]) => v >= 0.7)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
