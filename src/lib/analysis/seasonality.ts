import { mean, stdDev } from "@/lib/shadow/stats";
import type { DailyBar } from "@/lib/shadow/types";
import { msg, type Message } from "@/lib/i18n/message";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Monthly seasonality.
 *
 * Seasonality is the easiest place in this product to mislead someone. With a
 * handful of years of history, "this stock rises in December" is almost always
 * an artefact of two or three observations, and presenting it as a pattern
 * invites exactly the delusion the product exists to avoid.
 *
 * So this module reports the sample size next to every figure, refuses to call
 * anything a pattern below a minimum number of observations, and reports a
 * consistency measure rather than only an average. A month that averages +3%
 * across five years that were +15%, -9%, +4%, -1% and +6% is not a seasonal
 * tendency, and the output must make that visible.
 */

/** Years of observations required before a month is described as a tendency. */
const MIN_YEARS = 4;

export interface MonthStat {
  /** 1-12. */
  month: number;
  labelKey: TranslationKey;
  averageReturn: number;
  medianReturn: number;
  /** Fraction of years the month was positive, 0-1. */
  hitRate: number;
  /** Dispersion of monthly returns, so the average can be read in context. */
  volatility: number;
  years: number;
  /** True only when there are enough years to describe a tendency. */
  reliable: boolean;
}

export interface SeasonalityResult {
  months: MonthStat[];
  /** Strongest and weakest reliable months, or null when none qualify. */
  best: MonthStat | null;
  worst: MonthStat | null;
  totalYears: number;
  caveats: Message[];
}

const MONTH_KEY: TranslationKey[] = [
  "seasonality.month.1", "seasonality.month.2", "seasonality.month.3",
  "seasonality.month.4", "seasonality.month.5", "seasonality.month.6",
  "seasonality.month.7", "seasonality.month.8", "seasonality.month.9",
  "seasonality.month.10", "seasonality.month.11", "seasonality.month.12",
];

/**
 * Computes month-by-month statistics from a daily price series.
 *
 * Returns are measured from each month's first close to its last, so partial
 * months at the ends of the series are included on the same basis rather than
 * silently distorting the average.
 */
export function analyzeSeasonality(bars: DailyBar[]): SeasonalityResult {
  const sorted = [...bars]
    .filter((b) => b.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group closes by calendar month.
  const byMonth = new Map<string, DailyBar[]>();
  for (const bar of sorted) {
    const key = bar.date.slice(0, 7); // YYYY-MM
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(bar);
    else byMonth.set(key, [bar]);
  }

  // One return per calendar month observed.
  const returnsByMonth = new Map<number, number[]>();
  const yearsSeen = new Set<string>();

  for (const [key, monthBars] of byMonth) {
    if (monthBars.length < 2) continue;
    const month = Number(key.slice(5, 7));
    const first = monthBars[0].close;
    const last = monthBars[monthBars.length - 1].close;
    if (first <= 0) continue;

    yearsSeen.add(key.slice(0, 4));
    const ret = last / first - 1;
    const bucket = returnsByMonth.get(month);
    if (bucket) bucket.push(ret);
    else returnsByMonth.set(month, [ret]);
  }

  const months: MonthStat[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const rets = returnsByMonth.get(m) ?? [];
    if (rets.length === 0) continue;

    const positives = rets.filter((r) => r > 0).length;
    months.push({
      month: m,
      labelKey: MONTH_KEY[m - 1],
      averageReturn: mean(rets),
      medianReturn: median(rets),
      hitRate: positives / rets.length,
      volatility: stdDev(rets),
      years: rets.length,
      reliable: rets.length >= MIN_YEARS,
    });
  }

  const reliable = months.filter((m) => m.reliable);
  const ranked = [...reliable].sort((a, b) => b.averageReturn - a.averageReturn);

  const caveats: Message[] = [msg("seasonality.notPredictive")];

  // The daily transaction endpoint caps its window at 90 days, so a single
  // fetch covers only three or four months of one year. Saying so plainly is
  // better than presenting four partial months as a seasonal profile.
  if (months.length < 12) {
    caveats.push(msg("seasonality.partialView", { available: months.length }));
  }

  if (reliable.length === 0) {
    caveats.push(msg("seasonality.noneReliable", { minYears: MIN_YEARS }));
  } else if (reliable.length < months.length) {
    caveats.push(
      msg("seasonality.someUnreliable", {
        count: months.length - reliable.length,
        total: months.length,
        minYears: MIN_YEARS,
      }),
    );
  }

  const inconsistent = reliable.filter(
    (m) => m.volatility > Math.abs(m.averageReturn) * 2,
  );
  if (inconsistent.length > 0) {
    caveats.push(msg("seasonality.inconsistent"));
  }

  return {
    months,
    best: ranked[0] ?? null,
    worst: ranked.at(-1) ?? null,
    totalYears: yearsSeen.size,
    caveats,
  };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
