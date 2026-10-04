import type { DailyBar } from "@/lib/shadow/types";

/**
 * Price and volume facts for the latest session, from the daily bars the
 * analysis already fetched. Stored with each daily snapshot so the
 * watchlist and custom alert rules can read them without another request.
 *
 * Every field is null when the series is too short to support it, never a
 * made-up zero: a rule must not fire on a value nobody measured.
 */

/** Sessions in the volume average. About a trading month. */
export const VOLUME_WINDOW = 20;

export interface MarketFacts {
  asOf: string | null;
  lastClose: number | null;
  prevClose: number | null;
  /** Change over the latest session, as a fraction. */
  change1d: number | null;
  /** Change over the last five sessions, as a fraction. */
  return5d: number | null;
  volume: number | null;
  /** Average volume over the sessions before the latest one. */
  avgVolume20: number | null;
  /** Latest volume against that average; 2 means twice the usual. */
  volumeRatio: number | null;
  /** Standard deviation of daily returns over the series, as a fraction. */
  dailyVolatility: number | null;
}

export function marketFacts(bars: DailyBar[]): MarketFacts {
  const valid = bars.filter((b) => Number.isFinite(b.close) && b.close > 0);
  const last = valid.at(-1);
  const prev = valid.at(-2);
  const fifthBack = valid.at(-6);

  const priorVolumes = valid
    .slice(-(VOLUME_WINDOW + 1), -1)
    .map((b) => b.volume)
    .filter((v) => Number.isFinite(v) && v >= 0);
  // Under half a window is too few sessions to call anything "usual".
  const avgVolume20 =
    priorVolumes.length >= VOLUME_WINDOW / 2
      ? priorVolumes.reduce((sum, v) => sum + v, 0) / priorVolumes.length
      : null;

  const returns = valid.slice(1).map((b, i) => b.close / valid[i].close - 1);
  let dailyVolatility: number | null = null;
  if (returns.length >= 10) {
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    dailyVolatility = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1));
  }

  const volume = last && Number.isFinite(last.volume) ? last.volume : null;
  return {
    asOf: last?.date ?? null,
    lastClose: last?.close ?? null,
    prevClose: prev?.close ?? null,
    change1d: last && prev ? last.close / prev.close - 1 : null,
    return5d: last && fifthBack ? last.close / fifthBack.close - 1 : null,
    volume,
    avgVolume20,
    volumeRatio: volume !== null && avgVolume20 ? volume / avgVolume20 : null,
    dailyVolatility,
  };
}
