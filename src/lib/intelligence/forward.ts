import type { ShadowPoint } from "@/lib/shadow/types";

/**
 * What a stock and its twin did in the sessions after a given date.
 *
 * Read from a later analysis's own series: each point holds the cumulative
 * return since that window's start for both the stock and the twin, so the
 * move between two dates is the ratio of their growth factors. The later twin
 * has been refitted since the signal was recorded, which is a real limitation
 * the track record page states rather than hides; it is still the same peer
 * group, weighted to track the stock.
 */

/** Sessions after a signal that its outcome is measured over. */
export const FORWARD_SESSIONS = 5;

export interface ForwardOutcome {
  sessions: number;
  stockReturn: number;
  twinReturn: number;
}

export type ForwardResult =
  | { status: "resolved"; outcome: ForwardOutcome }
  /** Not enough sessions have passed yet; try again on a later run. */
  | { status: "pending" }
  /** The date has left the analysis window and can never be resolved. */
  | { status: "unresolvable" };

export function forwardOutcome(
  series: ShadowPoint[],
  fromDate: string,
  sessions = FORWARD_SESSIONS,
): ForwardResult {
  if (series.length === 0) return { status: "pending" };

  const start = series.findIndex((p) => p.date === fromDate);
  if (start === -1) {
    // Older than the first point means the window has moved past it for good.
    // Newer, or simply absent, means this run has not seen that session.
    return fromDate < series[0].date ? { status: "unresolvable" } : { status: "pending" };
  }

  const end = start + sessions;
  if (end >= series.length) return { status: "pending" };

  const from = series[start];
  const to = series[end];
  return {
    status: "resolved",
    outcome: {
      sessions,
      stockReturn: (1 + to.actual) / (1 + from.actual) - 1,
      twinReturn: (1 + to.shadow) / (1 + from.shadow) - 1,
    },
  };
}
