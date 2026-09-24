"use client";

import type { MonthStat, SeasonalityResult } from "@/lib/analysis/seasonality";
import { formatPercent } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";

/**
 * Monthly seasonality.
 *
 * Months without enough years are drawn faintly and marked, rather than being
 * hidden or shown at full strength. Hiding them would overstate how much
 * history supports the chart; showing them identically would invite a reader to
 * treat two observations as a pattern.
 *
 * The hit rate sits next to the average deliberately. A month averaging +3%
 * across years of +15, -9, +4, -1 and +6 has a hit rate of 60%, and seeing
 * both figures together makes clear that the average describes no typical year.
 */

export function SeasonalityPanel({ data }: { data: SeasonalityResult }) {
  const { t, tm } = useTranslation();

  if (data.months.length === 0) {
    return <p className="text-sm text-text-muted">{t("seasonality.notEnoughHistory")}</p>;
  }

  const scale = Math.max(
    ...data.months.map((m) => Math.abs(m.averageReturn)),
    0.005,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {data.months.map((month) => (
          <MonthRow key={month.month} month={month} scale={scale} />
        ))}
      </div>

      {data.best && data.worst && data.best.month !== data.worst.month ? (
        <p className="text-sm text-text-muted">
          {t("seasonality.summary", {
            years: data.totalYears,
            best: t(data.best.labelKey),
            bestReturn: formatPercent(data.best.averageReturn),
            worst: t(data.worst.labelKey),
            worstReturn: formatPercent(data.worst.averageReturn),
          })}
        </p>
      ) : null}

      <ul className="space-y-1">
        {data.caveats.map((caveat, i) => (
          <li key={i} className="text-xs leading-relaxed text-text-subtle">
            {tm(caveat)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthRow({ month, scale }: { month: MonthStat; scale: number }) {
  const { t } = useTranslation();
  const magnitude = Math.min(Math.abs(month.averageReturn) / scale, 1);
  const widthPct = magnitude * 50;
  const positive = month.averageReturn >= 0;
  const monthLabel = t(month.labelKey);

  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-8 shrink-0 text-xs ${month.reliable ? "text-text-muted" : "text-text-subtle"}`}
      >
        {monthLabel.slice(0, 3)}
      </span>

      <div
        className="relative h-3 flex-1 rounded bg-surface-raised"
        role="img"
        aria-label={t("seasonality.monthAriaLabel", {
          month: monthLabel,
          avgReturn: formatPercent(month.averageReturn),
          years: month.years,
          yearLabel: t(
            month.years === 1 ? "seasonality.year.singular" : "seasonality.year.plural",
          ),
          hitRate: (month.hitRate * 100).toFixed(0),
          reliabilityNote: month.reliable ? "" : t("seasonality.tooFewYears"),
        })}
      >
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 rounded"
          style={{
            width: `${widthPct}%`,
            backgroundColor: positive ? "var(--up)" : "var(--down)",
            left: positive ? "50%" : undefined,
            right: positive ? undefined : "50%",
            // Unreliable months are visibly faint, so the eye discounts them.
            opacity: month.reliable ? 0.85 : 0.3,
          }}
        />
      </div>

      <span
        className={`tnum w-14 shrink-0 text-right text-xs ${month.reliable ? "text-text-muted" : "text-text-subtle"}`}
      >
        {formatPercent(month.averageReturn, 1)}
      </span>

      <span className="tnum w-16 shrink-0 text-right text-[11px] text-text-subtle">
        {t("seasonality.hitRateOf", {
          percent: (month.hitRate * 100).toFixed(0),
          years: month.years,
        })}
        {month.reliable ? "" : "*"}
      </span>
    </div>
  );
}
