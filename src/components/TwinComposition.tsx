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
 *
 * The heaviest peer is highlighted, because it moves the twin the most and is
 * the first one worth questioning.
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

  const sorted = [...constituents].sort((a, b) => b.weight - a.weight);
  // Bars are scaled to the heaviest peer, so the largest fills the track and
  // the rest read as proportions of it.
  const maxWeight = sorted[0].weight || 1;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {sorted.map((c, i) => (
          <li
            key={c.symbol}
            className={`rounded-[var(--radius-sm)] px-4 py-3 ${
              i === 0 ? "accent-panel shadow-lg shadow-black/20" : "bg-surface-raised"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-extrabold tracking-tight text-text"
              >
                {c.symbol.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-text">{c.symbol}</div>
                <div className="truncate text-xs text-text-subtle">{c.companyName}</div>
              </div>
              <span className="tnum shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-text">
                {(c.weight * 100).toFixed(1)}%
              </span>
            </div>

            <div
              className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface"
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
                style={{ width: `${Math.max((c.weight / maxWeight) * 100, 4)}%` }}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-muted">
              <span>
                {t("twin.similarity", { value: `${(c.similarity * 100).toFixed(0)}%` })}
              </span>
              <span>{t("twin.correlation", { value: c.correlation.toFixed(2) })}</span>
              {topDimensions(c).map((d) => (
                <span key={d}>{t(DIMENSION_KEY[d] ?? "twin.dimension.correlation")}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-text-subtle">{t("twin.weightFootnote")}</p>
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
