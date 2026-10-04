import { formatIdr, formatPercent } from "@/lib/format";
import { msg, type Message } from "@/lib/i18n/message";
import type { WatchFacts } from "@/lib/intelligence/watch-facts";
import type { Alert } from "./rules";

/**
 * A user's own alert conditions on a watched stock: "price <= 4,350",
 * "volume at least twice the usual", "PE above 20".
 *
 * Checked once per trading day, after the close, against the facts the
 * daily run stored (Sectors data is end of day, so nothing here is
 * intraday). Three rules keep them honest and quiet:
 *
 * - A metric with no value that day (no snapshot yet, no PE published)
 *   skips the rule. Missing data is never treated as a match.
 * - A rule fires when its condition becomes true, not on every day it stays
 *   true. It re-arms once the condition has been false on a later run.
 * - "Equals" allows a tolerance: one price tick for prices, 0.5% otherwise,
 *   since an exact match on a ratio would practically never happen.
 */

export const METRICS = [
  "PRICE",
  "CHANGE_1D",
  "VOLUME",
  "VOLUME_RATIO",
  "RETURN_5D",
  "Z_SCORE",
  "STOCK_SPECIFIC",
  "PE",
  "PB",
  "DIVIDEND_YIELD",
  "RANGE_POSITION",
] as const;
export type Metric = (typeof METRICS)[number];

export const OPERATORS = ["LT", "LTE", "EQ", "GTE", "GT"] as const;
export type Operator = (typeof OPERATORS)[number];

export const OPERATOR_SYMBOL: Record<Operator, string> = { LT: "<", LTE: "≤", EQ: "=", GTE: "≥", GT: ">" };

/** Rules allowed per watched stock. */
export const MAX_RULES = 10;

/** How a metric is entered and shown. Percent metrics are stored as fractions. */
export const METRIC_UNIT: Record<Metric, "idr" | "percent" | "shares" | "times" | "z" | "ratio"> = {
  PRICE: "idr",
  CHANGE_1D: "percent",
  VOLUME: "shares",
  VOLUME_RATIO: "times",
  RETURN_5D: "percent",
  Z_SCORE: "z",
  STOCK_SPECIFIC: "percent",
  PE: "ratio",
  PB: "ratio",
  DIVIDEND_YIELD: "percent",
  RANGE_POSITION: "percent",
};

export interface RuleState {
  id: string;
  metric: Metric;
  operator: Operator;
  value: number;
  enabled: boolean;
  autoTune: boolean;
  preset: string | null;
  note: string | null;
  lastMet: boolean | null;
}

/** The metric's value in the stored facts, or null when unknown. */
export function metricValue(facts: WatchFacts, metric: Metric): number | null {
  const p = facts.prices;
  const s = facts.stats;
  switch (metric) {
    case "PRICE":
      return p?.lastClose ?? null;
    case "CHANGE_1D":
      return p?.change1d ?? null;
    case "VOLUME":
      return p?.volume ?? null;
    case "VOLUME_RATIO":
      return p?.volumeRatio ?? null;
    case "RETURN_5D":
      return p?.return5d ?? null;
    case "Z_SCORE":
      // Strength of the divergence either way; the sign is in the alert text.
      return Math.abs(facts.zScore);
    case "STOCK_SPECIFIC":
      return facts.idio;
    case "PE":
      return s.pe;
    case "PB":
      return s.pb;
    case "DIVIDEND_YIELD":
      return s.dividendYield;
    case "RANGE_POSITION":
      return s.rangePosition;
  }
}

/** IDX price fractions (tick sizes) by price band. */
export function tickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

export function roundToTick(price: number, direction: "down" | "up"): number {
  const tick = tickSize(price);
  return (direction === "down" ? Math.floor(price / tick) : Math.ceil(price / tick)) * tick;
}

export function isMet(value: number, operator: Operator, target: number, metric: Metric): boolean {
  switch (operator) {
    case "LT":
      return value < target;
    case "LTE":
      return value <= target;
    case "GT":
      return value > target;
    case "GTE":
      return value >= target;
    case "EQ": {
      const tolerance = metric === "PRICE" ? tickSize(target) / 2 : Math.abs(target) * 0.005;
      return Math.abs(value - target) <= Math.max(tolerance, 1e-9);
    }
  }
}

const METRIC_KEY: Record<Metric, Message["key"]> = {
  PRICE: "rule.metric.PRICE",
  CHANGE_1D: "rule.metric.CHANGE_1D",
  VOLUME: "rule.metric.VOLUME",
  VOLUME_RATIO: "rule.metric.VOLUME_RATIO",
  RETURN_5D: "rule.metric.RETURN_5D",
  Z_SCORE: "rule.metric.Z_SCORE",
  STOCK_SPECIFIC: "rule.metric.STOCK_SPECIFIC",
  PE: "rule.metric.PE",
  PB: "rule.metric.PB",
  DIVIDEND_YIELD: "rule.metric.DIVIDEND_YIELD",
  RANGE_POSITION: "rule.metric.RANGE_POSITION",
};

export function metricLabel(metric: Metric): Message {
  return msg(METRIC_KEY[metric]);
}

/** A metric's value written for a person, in the metric's own unit. */
export function formatMetric(metric: Metric, value: number): string {
  switch (METRIC_UNIT[metric]) {
    case "idr":
      return formatIdr(value);
    case "percent":
      return metric === "RANGE_POSITION" ? `${Math.round(value * 100)}%` : formatPercent(value);
    case "shares":
      return Math.round(value).toLocaleString("id-ID");
    case "times":
      return `${value.toFixed(1)}x`;
    case "z":
      return value.toFixed(1);
    case "ratio":
      return value.toFixed(1);
  }
}

/** "price ≤ Rp 4.350" as a translatable sentence fragment. */
export function describeRule(rule: Pick<RuleState, "metric" | "operator" | "value">): Message {
  return msg("rule.condition", {
    metric: metricLabel(rule.metric),
    op: OPERATOR_SYMBOL[rule.operator],
    value: formatMetric(rule.metric, rule.value),
  });
}

export interface RuleOutcome {
  id: string;
  /** Null when the metric was unknown; the stored state is left as it was. */
  met: boolean | null;
  value: number | null;
  triggered: boolean;
}

export function evaluateRules(
  rules: RuleState[],
  facts: WatchFacts,
): { outcomes: RuleOutcome[]; alerts: Alert[] } {
  const outcomes: RuleOutcome[] = [];
  const alerts: Alert[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const value = metricValue(facts, rule.metric);
    if (value === null || !Number.isFinite(value)) {
      outcomes.push({ id: rule.id, met: null, value: null, triggered: false });
      continue;
    }
    const met = isMet(value, rule.operator, rule.value, rule.metric);
    // Fires on the transition into "met". A first ever check that is
    // already met counts as a transition: the user asked to know.
    const triggered = met && rule.lastMet !== true;
    outcomes.push({ id: rule.id, met, value, triggered });

    if (triggered) {
      const body: Message[] = [
        msg("alert.ruleBody", {
          metric: metricLabel(rule.metric),
          value: formatMetric(rule.metric, value),
          date: facts.prices?.asOf ?? facts.asOf,
        }),
      ];
      if (rule.note) body.push(msg("alert.ruleNote", { note: rule.note }));
      alerts.push({
        kind: "RULE",
        symbol: facts.symbol,
        title: msg("alert.ruleTitle", { symbol: facts.symbol, condition: describeRule(rule) }),
        body,
        // Between a corporate action and a divergence: the user asked for
        // exactly this, but it is not new information about the stock.
        priority: 1,
        payload: { ruleId: rule.id, metric: rule.metric, operator: rule.operator, target: rule.value, value },
      });
    }
  }
  return { outcomes, alerts };
}

// Suggestions and auto-adjust ------------------------------------------------

export const PRESETS = ["priceDrop", "priceRise", "volumeSpike", "divergence", "nearLow", "nearHigh"] as const;
export type Preset = (typeof PRESETS)[number];

const PRESET_RULE: Record<Preset, { metric: Metric; operator: Operator }> = {
  priceDrop: { metric: "PRICE", operator: "LTE" },
  priceRise: { metric: "PRICE", operator: "GTE" },
  volumeSpike: { metric: "VOLUME_RATIO", operator: "GTE" },
  divergence: { metric: "Z_SCORE", operator: "GTE" },
  nearLow: { metric: "RANGE_POSITION", operator: "LTE" },
  nearHigh: { metric: "RANGE_POSITION", operator: "GTE" },
};

/** The smallest price band a suggestion uses, so a calm stock is not set to fire on noise. */
const MIN_BAND = 0.03;

/**
 * The value a preset takes for the stock's latest condition, or null when
 * the data it needs is missing. Price bands are two daily standard
 * deviations from the last close, at least 3%, rounded to a real tick, so a
 * volatile stock gets a wider band than a steady one.
 */
export function presetValue(preset: Preset, facts: WatchFacts, signalZ: number): number | null {
  const close = facts.prices?.lastClose ?? null;
  const vol = facts.prices?.dailyVolatility ?? null;
  const band = Math.max(MIN_BAND, vol !== null ? 2 * vol : MIN_BAND);
  switch (preset) {
    case "priceDrop":
      return close === null ? null : roundToTick(close * (1 - band), "down");
    case "priceRise":
      return close === null ? null : roundToTick(close * (1 + band), "up");
    case "volumeSpike":
      return facts.prices?.avgVolume20 ? 2 : null;
    case "divergence":
      return Math.round(Math.max(signalZ, Math.abs(facts.zScore) + 0.5) * 10) / 10;
    case "nearLow":
      return facts.stats.rangePosition === null ? null : 0.1;
    case "nearHigh":
      return facts.stats.rangePosition === null ? null : 0.9;
  }
}

export interface Suggestion {
  preset: Preset;
  metric: Metric;
  operator: Operator;
  value: number;
}

export function suggestRules(facts: WatchFacts, signalZ: number): Suggestion[] {
  return PRESETS.flatMap((preset) => {
    const value = presetValue(preset, facts, signalZ);
    return value === null ? [] : [{ preset, ...PRESET_RULE[preset], value }];
  });
}

export function isPreset(value: unknown): value is Preset {
  return typeof value === "string" && (PRESETS as readonly string[]).includes(value);
}

/**
 * The next value for an auto-adjusting rule after a run, or null to keep
 * the current one (not auto, unknown preset, or data missing).
 */
export function retune(rule: Pick<RuleState, "autoTune" | "preset" | "value">, facts: WatchFacts, signalZ: number): number | null {
  if (!rule.autoTune || !isPreset(rule.preset)) return null;
  const next = presetValue(rule.preset, facts, signalZ);
  return next === null || next === rule.value ? null : next;
}

/** Converts what a person typed into the stored value (percent to fraction). */
export function parseRuleInput(metric: Metric, raw: number): number {
  return METRIC_UNIT[metric] === "percent" ? raw / 100 : raw;
}

/** The value as a person would type it back in (fraction to percent). */
export function toRuleInput(metric: Metric, value: number): number {
  return METRIC_UNIT[metric] === "percent" ? Math.round(value * 10000) / 100 : value;
}
