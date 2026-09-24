import type { DivergenceVerdict } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import type { DivergenceType } from "@/lib/smartmoney/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { BadgeTone } from "./ui/primitives";

/**
 * Label, tone and plain-language meaning for each verdict the engines emit.
 *
 * Shared by the stat cards, the narrative and the panels, so a verdict reads
 * the same wherever it appears. Changing a label here changes it everywhere.
 */

export const DIVERGENCE_COPY: Record<
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

export const REALITY_COPY: Record<
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

export const CONFIDENCE_KEY: Record<RealityCheck["confidence"], TranslationKey> = {
  high: "verdict.confidence.high",
  moderate: "verdict.confidence.moderate",
  low: "verdict.confidence.low",
};

export const SMART_MONEY_COPY: Record<
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
