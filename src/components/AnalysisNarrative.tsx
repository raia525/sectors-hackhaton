"use client";

import type { ShadowAnalysis } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import type { SmartMoneySignal } from "@/lib/smartmoney/types";
import { Badge, formatPercent } from "./ui/primitives";
import { IconSpark } from "./ui/icons";
import { useTranslation } from "@/lib/i18n/client";
import { CONFIDENCE_KEY, DIVERGENCE_COPY, REALITY_COPY, SMART_MONEY_COPY } from "./verdictCopy";

/**
 * The analysis told as a short story.
 *
 * The panels further down each answer one question. This card reads their
 * answers in order, as prose, for someone who wants the conclusion before the
 * evidence: what the stock did, how much of it was its own, whether that is
 * unusual, whether the news agrees, and what positioning says.
 *
 * It adds no claim of its own. Every sentence is either a finding the engines
 * already produced or a fixed framing line, so the story can never say more
 * than the numbers support.
 */
export function AnalysisNarrative({
  symbol,
  shadow,
  reality,
  smartMoney,
}: {
  symbol: string;
  shadow: ShadowAnalysis;
  reality: RealityCheck;
  smartMoney: SmartMoneySignal | null;
}) {
  const { t, tm } = useTranslation();
  const verdict = DIVERGENCE_COPY[shadow.verdict];
  const realityCopy = REALITY_COPY[reality.verdict];

  // The first reality finding is always the attribution sentence (see
  // reality-check.ts); the rest compare the news against the price.
  const [attribution, ...comparison] = reality.findings;

  const paragraphs: string[] = [
    [
      t("narrative.opening", {
        sessions: shadow.fitWindow,
        symbol,
        total: formatPercent(shadow.attribution.total),
      }),
      attribution ? tm(attribution) : "",
    ]
      .filter(Boolean)
      .join(" "),
    [t(verdict.meaningKey), ...comparison.map((f) => tm(f))].join(" "),
  ];

  if (smartMoney && !smartMoney.insufficientData) {
    paragraphs.push(
      `${t("narrative.smartMoneyLead")} ${t(SMART_MONEY_COPY[smartMoney.type].meaningKey)}`,
    );
  }

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[18px] font-extrabold tracking-tight text-text">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconSpark />
          </span>
          {t("narrative.title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone={verdict.tone}>{t(verdict.labelKey)}</Badge>
          <Badge tone={realityCopy.tone}>{t(realityCopy.labelKey)}</Badge>
          <Badge tone="neutral">
            {t("verdict.confidence", { level: t(CONFIDENCE_KEY[reality.confidence]) })}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
        <p className="text-[17px] font-semibold leading-relaxed text-text">{paragraphs[0]}</p>
        <div className="space-y-3">
          {paragraphs.slice(1).map((paragraph, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-text-muted">
              {paragraph}
            </p>
          ))}
          <p className="border-t border-border pt-3 text-[13px] leading-relaxed text-text-subtle">
            {t("narrative.closing")}
          </p>
        </div>
      </div>
    </section>
  );
}
