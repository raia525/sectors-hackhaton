"use client";

import type { DivergenceVerdict, ShadowAnalysis } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import { Badge, formatPercent, formatSigned, type BadgeTone } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * The headline read on a stock: how far it has broken from its twin, and
 * whether the news agrees.
 *
 * Copy is written so the number and its reliability arrive together. A large
 * divergence on a poorly fitted twin is presented as a weaker claim than the
 * same divergence on a well fitted one, because it is one.
 */

const VERDICT_COPY: Record<
  DivergenceVerdict,
  { labelKey: TranslationKey; tone: BadgeTone; meaningKey: TranslationKey }
> = {
  extreme: {
    labelKey: "verdict.divergence.extreme",
    tone: "extreme",
    meaningKey: "verdict.divergence.extreme.meaning",
  },
  significant: {
    labelKey: "verdict.divergence.significant",
    tone: "significant",
    meaningKey: "verdict.divergence.significant.meaning",
  },
  moderate: {
    labelKey: "verdict.divergence.moderate",
    tone: "moderate",
    meaningKey: "verdict.divergence.moderate.meaning",
  },
  normal: {
    labelKey: "verdict.divergence.normal",
    tone: "normal",
    meaningKey: "verdict.divergence.normal.meaning",
  },
  aligned: {
    labelKey: "verdict.divergence.aligned",
    tone: "normal",
    meaningKey: "verdict.divergence.aligned.meaning",
  },
};

const REALITY_COPY: Record<
  RealityCheck["verdict"],
  { labelKey: TranslationKey; tone: BadgeTone }
> = {
  confirmed: { labelKey: "verdict.reality.confirmed", tone: "normal" },
  contradiction: { labelKey: "verdict.reality.contradiction", tone: "extreme" },
  narrative_ahead_of_price: {
    labelKey: "verdict.reality.narrativeAhead",
    tone: "significant",
  },
  price_ahead_of_narrative: {
    labelKey: "verdict.reality.priceAhead",
    tone: "significant",
  },
  insufficient_evidence: { labelKey: "verdict.reality.insufficient", tone: "neutral" },
};

const CONFIDENCE_KEY: Record<RealityCheck["confidence"], TranslationKey> = {
  high: "verdict.confidence.high",
  moderate: "verdict.confidence.moderate",
  low: "verdict.confidence.low",
};

export function VerdictPanel({
  shadow,
  reality,
}: {
  shadow: ShadowAnalysis;
  reality: RealityCheck;
}) {
  const { t, tm } = useTranslation();
  const verdict = VERDICT_COPY[shadow.verdict];
  const realityVerdict = REALITY_COPY[reality.verdict];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={verdict.tone}>{t(verdict.labelKey)}</Badge>
        <Badge tone={realityVerdict.tone}>{t(realityVerdict.labelKey)}</Badge>
        <Badge tone="neutral">
          {t("verdict.confidence", { level: t(CONFIDENCE_KEY[reality.confidence]) })}
        </Badge>
      </div>

      <p className="text-[15px] leading-relaxed text-text">{t(verdict.meaningKey)}</p>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Figure
          label={t("verdict.stat.stockSpecific")}
          value={formatPercent(shadow.attribution.idiosyncratic)}
          tone={shadow.attribution.idiosyncratic >= 0 ? "up" : "down"}
        />
        <Figure
          label={t("verdict.stat.zScore")}
          value={formatSigned(shadow.zScore)}
        />
        <Figure
          label={t("verdict.stat.twinFit")}
          value={`${(shadow.fitQuality * 100).toFixed(0)}%`}
          hint={shadow.fitQuality < 0.3 ? t("verdict.stat.weak") : undefined}
        />
        <Figure
          label={t("verdict.stat.peersUsed")}
          value={String(shadow.constituents.length)}
        />
      </dl>

      <ul className="space-y-2">
        {reality.findings.map((finding, i) => (
          <li key={i} className="text-sm leading-relaxed text-text-muted">
            {tm(finding)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "up" | "down";
  hint?: string;
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text";
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-text-subtle">
        {label}
      </dt>
      <dd className={`tnum mt-1 text-lg ${toneClass}`}>
        {value}
        {hint ? (
          <span className="ml-1.5 text-xs font-normal text-text-subtle">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}
