import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Translation keys for verdicts stored as plain strings in a snapshot.
 *
 * Snapshots store the engines' verdict values as text, so they read back as
 * `string`, not the engines' union types. An unrecognised value (from an
 * older engine version, say) falls back to a neutral label rather than
 * rendering a raw identifier.
 */

const DIVERGENCE: Record<string, TranslationKey> = {
  extreme: "verdict.divergence.extreme",
  significant: "verdict.divergence.significant",
  moderate: "verdict.divergence.moderate",
  normal: "verdict.divergence.normal",
  aligned: "verdict.divergence.aligned",
};

const REALITY: Record<string, TranslationKey> = {
  confirmed: "verdict.reality.confirmed",
  contradiction: "verdict.reality.contradiction",
  narrative_ahead_of_price: "verdict.reality.narrativeAhead",
  price_ahead_of_narrative: "verdict.reality.priceAhead",
  insufficient_evidence: "verdict.reality.insufficient",
};

const SMART_MONEY: Record<string, TranslationKey> = {
  bullish_divergence: "smartmoney.type.bullish",
  bearish_divergence: "smartmoney.type.bearish",
  confirmation_up: "smartmoney.type.confirmedUp",
  confirmation_down: "smartmoney.type.confirmedDown",
  no_signal: "smartmoney.type.none",
};

export function divergenceLabel(verdict: string): TranslationKey {
  return DIVERGENCE[verdict] ?? "verdict.divergence.normal";
}

export function realityLabel(verdict: string): TranslationKey {
  return REALITY[verdict] ?? "verdict.reality.insufficient";
}

export function smartMoneyLabel(type: string): TranslationKey {
  return SMART_MONEY[type] ?? "smartmoney.type.none";
}
