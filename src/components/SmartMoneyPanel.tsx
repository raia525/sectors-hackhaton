"use client";

import type { DivergenceType, SmartMoneySignal } from "@/lib/smartmoney/types";
import { Badge, formatIdr, formatPercent, type BadgeTone } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Institutional and foreign positioning against price.
 *
 * The conviction meter is labelled as scoring the strength of the observed
 * disagreement, not the odds of a future return. That distinction is the whole
 * reason the feature is defensible, so the wording carries it rather than
 * leaving a bare number to be read as a price target.
 */

const TYPE_COPY: Record<
  DivergenceType,
  { labelKey: TranslationKey; tone: BadgeTone; meaningKey: TranslationKey }
> = {
  bullish_divergence: {
    labelKey: "smartmoney.type.bullish",
    tone: "extreme",
    meaningKey: "smartmoney.meaning.bullish",
  },
  bearish_divergence: {
    labelKey: "smartmoney.type.bearish",
    tone: "significant",
    meaningKey: "smartmoney.meaning.bearish",
  },
  confirmation_up: {
    labelKey: "smartmoney.type.confirmedUp",
    tone: "normal",
    meaningKey: "smartmoney.meaning.confirmedUp",
  },
  confirmation_down: {
    labelKey: "smartmoney.type.confirmedDown",
    tone: "normal",
    meaningKey: "smartmoney.meaning.confirmedDown",
  },
  no_signal: {
    labelKey: "smartmoney.type.none",
    tone: "neutral",
    meaningKey: "smartmoney.meaning.none",
  },
};

export function SmartMoneyPanel({ signal }: { signal: SmartMoneySignal }) {
  const { t, tm } = useTranslation();
  const copy = TYPE_COPY[signal.type];

  if (signal.insufficientData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-muted">{t("smartmoney.notEnoughData")}</p>
        <ul className="space-y-1">
          {signal.caveats.map((c, i) => (
            <li key={i} className="text-xs text-text-subtle">
              {tm(c)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={copy.tone}>{t(copy.labelKey)}</Badge>
        <Badge tone="neutral">
          {t("smartmoney.conviction", { value: signal.conviction })}
        </Badge>
      </div>

      <ConvictionMeter value={signal.conviction} />

      <p className="text-[15px] leading-relaxed text-text">{t(copy.meaningKey)}</p>

      <dl className="grid grid-cols-2 gap-4">
        <Figure
          label={t("smartmoney.priceOverWindow")}
          value={formatPercent(signal.priceReturn)}
          tone={signal.priceReturn >= 0 ? "up" : "down"}
        />
        <Figure
          label={t("smartmoney.netForeignFlow")}
          value={formatIdr(signal.foreignFlow.netIdr)}
          tone={signal.foreignFlow.netIdr >= 0 ? "up" : "down"}
        />
        <Figure
          label={t("smartmoney.flowIntensity")}
          value={formatPercent(signal.foreignFlow.intensity)}
          hint={t("smartmoney.flowIntensityHint")}
        />
        {signal.ownership ? (
          <Figure
            label={t("smartmoney.institutionalShare")}
            value={`${signal.ownership.shareChangePp >= 0 ? "+" : ""}${signal.ownership.shareChangePp.toFixed(2)} pp`}
            tone={signal.ownership.shareChangePp >= 0 ? "up" : "down"}
            hint={t("smartmoney.institutionalShareHint", {
              months: signal.ownership.months,
            })}
          />
        ) : (
          <Figure
            label={t("smartmoney.institutionalShare")}
            value={t("smartmoney.notAvailable")}
          />
        )}
      </dl>

      <ul className="space-y-2">
        {signal.findings.map((finding, i) => (
          <li key={i} className="text-sm leading-relaxed text-text-muted">
            {tm(finding)}
          </li>
        ))}
      </ul>

      <ul className="space-y-1 border-t border-border pt-3">
        {signal.caveats.map((caveat, i) => (
          <li key={i} className="text-xs leading-relaxed text-text-subtle">
            {tm(caveat)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConvictionMeter({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-raised"
        role="img"
        aria-label={`${t("smartmoney.conviction", { value })} / 100. ${t("smartmoney.convictionFootnote")}`}
      >
        <div
          aria-hidden
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-text-subtle">
        {t("smartmoney.convictionFootnote")}
      </p>
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
      <dd className={`tnum mt-0.5 text-sm ${toneClass}`}>{value}</dd>
      {hint ? <dd className="text-[11px] text-text-subtle">{hint}</dd> : null}
    </div>
  );
}
