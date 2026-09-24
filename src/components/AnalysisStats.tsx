"use client";

import type { ShadowAnalysis } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import { Badge, StatCard, formatPercent, formatSigned } from "./ui/primitives";
import { IconActivity, IconLayers, IconNews, IconTarget } from "./ui/icons";
import { useTranslation } from "@/lib/i18n/client";
import { CONFIDENCE_KEY, DIVERGENCE_COPY, REALITY_COPY } from "./verdictCopy";

/**
 * The four headline figures of an analysis, as a row of stat cards.
 *
 * Each card pairs its number with what that number means, so the row can be
 * read on its own: how much of the move is the company's, how unusual that is,
 * how far the twin can be trusted, and whether the news agrees.
 */
export function AnalysisStats({
  shadow,
  reality,
}: {
  shadow: ShadowAnalysis;
  reality: RealityCheck;
}) {
  const { t } = useTranslation();
  const verdict = DIVERGENCE_COPY[shadow.verdict];
  const realityCopy = REALITY_COPY[reality.verdict];
  const specific = shadow.attribution.idiosyncratic;
  const fitPct = Math.round(shadow.fitQuality * 100);
  const weakFit = shadow.fitQuality < 0.3;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t("verdict.stat.stockSpecific")}
        value={formatPercent(specific)}
        tone={specific >= 0 ? "up" : "down"}
        icon={<IconTarget />}
        caption={t("stats.stockSpecificCaption")}
      />
      <StatCard
        label={t("verdict.stat.zScore")}
        value={formatSigned(shadow.zScore)}
        icon={<IconActivity />}
        caption={<Badge tone={verdict.tone}>{t(verdict.labelKey)}</Badge>}
      />
      <StatCard
        label={t("verdict.stat.twinFit")}
        value={`${fitPct}%`}
        icon={<IconLayers />}
        iconTone={weakFit ? "down" : "accent"}
        caption={
          weakFit
            ? t("stats.twinFitWeak")
            : t("stats.twinFitCaption", { count: shadow.constituents.length })
        }
        footer={
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-raised"
            role="img"
            aria-label={`${t("verdict.stat.twinFit")} ${fitPct}%`}
          >
            <div
              aria-hidden
              className={`h-full rounded-full ${weakFit ? "bg-down" : "bg-accent"}`}
              style={{ width: `${Math.max(fitPct, 3)}%` }}
            />
          </div>
        }
      />
      <StatCard
        label={t("stats.realityTitle")}
        value={
          <span className="block text-[21px] font-extrabold leading-tight">
            {t(realityCopy.labelKey)}
          </span>
        }
        icon={<IconNews />}
        caption={t("verdict.confidence", { level: t(CONFIDENCE_KEY[reality.confidence]) })}
      />
    </div>
  );
}
