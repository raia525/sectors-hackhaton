/**
 * Has the divergence signal meant anything so far?
 *
 * Every day's analysis is stored with what the stock did against its twin in
 * the sessions that followed. This module compares signal days (a large,
 * trustworthy divergence) with ordinary days, on one question: did the gap
 * keep widening in the same direction, or close?
 *
 * It describes the app's own history and nothing more. A handful of past
 * signals says little, so below MIN_SAMPLE the result is an explicit "not
 * enough history yet" rather than a percentage that would look precise and
 * mean nothing. That is the same rule the engines follow for a weak twin.
 */

/** Same bar the alert rules use, so "a signal" means the same thing everywhere. */
export const SIGNAL_Z = 2;
export const FIT_FLOOR = 0.3;
export const MIN_PEERS = 3;

/**
 * Resolved signals needed before a rate is shown. Chosen, not fitted: below
 * about ten, one or two outcomes swing the percentage by ten points or more.
 */
export const MIN_SAMPLE = 10;

export interface ResolvedRow {
  zScore: number;
  fitQuality: number;
  constituentCount: number;
  forwardStockReturn: number;
  forwardTwinReturn: number;
}

export interface Bucket {
  count: number;
  /** Share whose gap kept going the same way; null below MIN_SAMPLE. */
  continuedShare: number | null;
  /**
   * Average excess return over the twin, signed so positive means the gap
   * continued in the signal's direction. Null below MIN_SAMPLE.
   */
  avgSignedExcess: number | null;
}

export interface TrackRecord {
  signals: Bucket;
  ordinary: Bucket;
  /** True once the signal bucket has enough history to show rates. */
  enough: boolean;
  minSample: number;
}

export function isSignal(row: Pick<ResolvedRow, "zScore" | "fitQuality" | "constituentCount">) {
  return (
    Math.abs(row.zScore) >= SIGNAL_Z &&
    row.fitQuality >= FIT_FLOOR &&
    row.constituentCount >= MIN_PEERS
  );
}

export function summarizeTrackRecord(rows: ResolvedRow[]): TrackRecord {
  // A day with no direction cannot continue or reverse, so it is left out
  // rather than counted as either.
  const directional = rows.filter((r) => r.zScore !== 0);

  const signals = bucket(directional.filter(isSignal));
  const ordinary = bucket(directional.filter((r) => !isSignal(r)));

  return {
    signals,
    ordinary,
    enough: signals.continuedShare !== null,
    minSample: MIN_SAMPLE,
  };
}

function bucket(rows: ResolvedRow[]): Bucket {
  if (rows.length < MIN_SAMPLE) {
    return { count: rows.length, continuedShare: null, avgSignedExcess: null };
  }

  let continued = 0;
  let excessSum = 0;
  for (const row of rows) {
    const direction = Math.sign(row.zScore);
    const signedExcess = direction * (row.forwardStockReturn - row.forwardTwinReturn);
    if (signedExcess > 0) continued += 1;
    excessSum += signedExcess;
  }

  return {
    count: rows.length,
    continuedShare: continued / rows.length,
    avgSignedExcess: excessSum / rows.length,
  };
}
