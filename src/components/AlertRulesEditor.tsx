"use client";

import { useState } from "react";
import { addRule, applySuggestions, updateRule } from "@/app/portfolio/actions";
import { useTranslation } from "@/lib/i18n/client";
import {
  describeRule,
  formatMetric,
  MAX_RULES,
  METRICS,
  METRIC_UNIT,
  metricLabel,
  OPERATORS,
  OPERATOR_SYMBOL,
  toRuleInput,
  type Metric,
  type Operator,
  type Suggestion,
} from "@/lib/notifications/custom-rules";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { ActionForm, SubmitButton } from "./ActionForm";

/**
 * A watched stock's own alert rules: list, add, edit, switch off, delete,
 * and "suggest from latest", which proposes values computed on the server
 * from the stock's latest stored facts. Rules are checked once per trading
 * day after the close; the editor says so.
 */

export interface RuleView {
  id: string;
  metric: Metric;
  operator: Operator;
  value: number;
  enabled: boolean;
  autoTune: boolean;
  preset: string | null;
  note: string | null;
  lastMet: boolean | null;
  lastValue: number | null;
  lastTriggeredAt: string | null;
  tunedAt: string | null;
}

const UNIT_KEY: Record<(typeof METRIC_UNIT)[Metric], TranslationKey> = {
  idr: "rule.unit.idr",
  percent: "rule.unit.percent",
  shares: "rule.unit.shares",
  times: "rule.unit.times",
  z: "rule.unit.z",
  ratio: "rule.unit.ratio",
};

const PRESET_KEY: Record<string, TranslationKey> = {
  priceDrop: "rule.preset.priceDrop",
  priceRise: "rule.preset.priceRise",
  volumeSpike: "rule.preset.volumeSpike",
  divergence: "rule.preset.divergence",
  nearLow: "rule.preset.nearLow",
  nearHigh: "rule.preset.nearHigh",
};

const SMALL_BUTTON =
  "rounded-full border border-border px-3 py-1 text-xs font-semibold text-text transition-colors hover:bg-surface";
const FIELD =
  "h-9 rounded-full border border-border bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none";

export function AlertRulesEditor({
  symbol,
  rules,
  suggestions,
  current,
}: {
  symbol: string;
  rules: RuleView[];
  suggestions: Suggestion[];
  /** Each metric's latest stored value, shown next to the form for reference. */
  current: Partial<Record<Metric, number | null>>;
}) {
  const { t, tm } = useTranslation();
  const [metric, setMetric] = useState<Metric>("PRICE");
  const now = current[metric];
  const unit = METRIC_UNIT[metric];
  const fresh = suggestions.filter((s) => !rules.some((r) => r.preset === s.preset));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-text">{t("rule.title")}</h4>
        <p className="text-xs text-text-subtle">{t("rule.schedule")}</p>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-text-muted">{t("rule.none")}</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${rule.enabled ? "text-text" : "text-text-subtle line-through"}`}>
                    {tm(describeRule(rule))}
                  </p>
                  <p className="mt-0.5 text-xs text-text-subtle">
                    {[
                      rule.autoTune ? t("rule.autoSince", { date: (rule.tunedAt ?? "").slice(0, 10) }) : null,
                      rule.lastValue !== null
                        ? t("rule.lastSeen", { value: formatMetric(rule.metric, rule.lastValue) })
                        : t("rule.notChecked"),
                      rule.lastTriggeredAt ? t("rule.lastFired", { date: rule.lastTriggeredAt.slice(0, 10) }) : null,
                      rule.lastMet ? t("rule.metNow") : null,
                      rule.note,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rule.preset ? (
                    <RuleButton id={rule.id} intent="auto" label={rule.autoTune ? t("rule.autoOff") : t("rule.autoOn")} />
                  ) : null}
                  <RuleButton id={rule.id} intent="toggle" label={rule.enabled ? t("rule.pause") : t("rule.resume")} />
                  <RuleButton id={rule.id} intent="delete" label={t("rule.delete")} danger />
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer list-none text-xs font-semibold text-accent hover:underline">
                  {t("rule.edit")}
                </summary>
                <ActionForm action={updateRule} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={rule.id} />
                  <input type="hidden" name="intent" value="save" />
                  <select name="operator" defaultValue={rule.operator} aria-label={t("rule.operator")} className={FIELD}>
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>{OPERATOR_SYMBOL[op]}</option>
                    ))}
                  </select>
                  <input
                    name="value"
                    type="number"
                    step="any"
                    required
                    aria-label={t(UNIT_KEY[METRIC_UNIT[rule.metric]])}
                    defaultValue={toRuleInput(rule.metric, rule.value)}
                    className={`${FIELD} w-32`}
                  />
                  <input name="note" defaultValue={rule.note ?? ""} maxLength={120} placeholder={t("rule.note")} aria-label={t("rule.note")} className={`${FIELD} w-40`} />
                  <SubmitButton className={SMALL_BUTTON}>{t("rule.save")}</SubmitButton>
                </ActionForm>
                {rule.autoTune ? <p className="mt-1.5 text-xs text-text-subtle">{t("rule.editStopsAuto")}</p> : null}
              </details>
            </li>
          ))}
        </ul>
      )}

      {rules.length < MAX_RULES ? (
        <ActionForm action={addRule} className="rounded-[var(--radius-sm)] border border-dashed border-border-strong p-3">
          <input type="hidden" name="symbol" value={symbol} />
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-subtle">{t("rule.add")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-text-subtle">
              <span className="sr-only">{t("rule.metric")}</span>
              <select name="metric" value={metric} onChange={(e) => setMetric(e.target.value as Metric)} aria-label={t("rule.metric")} className={FIELD}>
                {METRICS.map((m) => (
                  <option key={m} value={m}>{tm(metricLabel(m))}</option>
                ))}
              </select>
            </label>
            <select name="operator" defaultValue="LTE" aria-label={t("rule.operator")} className={FIELD}>
              {OPERATORS.map((op) => (
                <option key={op} value={op}>{OPERATOR_SYMBOL[op]}</option>
              ))}
            </select>
            <input name="value" type="number" step="any" required aria-label={t(UNIT_KEY[unit])} placeholder={t(UNIT_KEY[unit])} className={`${FIELD} w-32`} />
            <input name="note" maxLength={120} placeholder={t("rule.note")} aria-label={t("rule.note")} className={`${FIELD} w-40`} />
            <SubmitButton className="h-9 rounded-full bg-accent px-4 text-xs font-bold text-accent-contrast hover:bg-accent-hover">
              {t("rule.addButton")}
            </SubmitButton>
          </div>
          <p className="mt-2 text-xs text-text-subtle">
            {now !== null && now !== undefined ? t("rule.currentValue", { value: formatMetric(metric, now) }) : t("rule.currentUnknown")}{" "}
            {t(UNIT_KEY[unit])}. {t("rule.equalsHint")}
          </p>
        </ActionForm>
      ) : (
        <p className="text-xs text-text-subtle">{t("rule.error.limit", { max: MAX_RULES })}</p>
      )}

      {fresh.length > 0 && rules.length < MAX_RULES ? (
        <ActionForm action={applySuggestions} className="rounded-[var(--radius-sm)] bg-accent-soft/60 p-3">
          <input type="hidden" name="symbol" value={symbol} />
          <p className="text-sm font-bold text-text">{t("rule.suggestTitle")}</p>
          <p className="mt-0.5 text-xs text-text-muted">{t("rule.suggestBody")}</p>
          <ul className="mt-2 space-y-1.5">
            {fresh.map((s) => (
              <li key={s.preset}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-text">
                  <input type="checkbox" name="preset" value={s.preset} defaultChecked className="mt-0.5 h-4 w-4 accent-accent-bright" />
                  <span>
                    <span className="font-semibold">{tm(describeRule(s))}</span>
                    <span className="block text-xs text-text-muted">{t(PRESET_KEY[s.preset])}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-text">
            <input type="checkbox" name="autoTune" defaultChecked className="mt-0.5 h-4 w-4 accent-accent-bright" />
            <span>
              <span className="font-semibold">{t("rule.autoTune")}</span>
              <span className="block text-xs text-text-muted">{t("rule.autoTuneHint")}</span>
            </span>
          </label>
          <SubmitButton className="mt-3 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-contrast hover:bg-accent-hover">
            {t("rule.suggestApply")}
          </SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}

function RuleButton({ id, intent, label, danger }: { id: string; intent: string; label: string; danger?: boolean }) {
  const { t } = useTranslation();
  return (
    <ActionForm action={updateRule} confirm={intent === "delete" ? t("rule.confirmDelete") : undefined}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <SubmitButton className={`${SMALL_BUTTON} ${danger ? "text-down" : ""}`}>{label}</SubmitButton>
    </ActionForm>
  );
}
