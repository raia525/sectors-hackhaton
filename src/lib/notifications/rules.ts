import type { ShadowAnalysis } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import type { CorporateActionItem } from "@/lib/analysis/corporate-actions";
import { msg, type Message } from "@/lib/i18n/message";
import { formatIdr } from "@/lib/format";

/**
 * Decides what is worth interrupting someone about.
 *
 * The governing constraint is that a notification people learn to ignore is
 * worse than no notification: it trains them to dismiss the one that matters.
 * So the rules here are biased heavily toward silence.
 *
 * Three mechanisms enforce that:
 *
 * 1. A threshold on signal strength, which the user sets per symbol.
 * 2. A cooldown, so a stock sitting above its threshold for a week produces one
 *    alert rather than seven.
 * 3. A materiality check, so a repeat alert only fires if the situation has
 *    meaningfully changed since the last one.
 *
 * Titles and bodies are Message descriptors rather than finished strings: this
 * module runs inside a scheduled job with no active browser session, so the
 * caller resolves each one in the recipient's stored locale (see
 * dispatch.ts) rather than the module guessing a language.
 */

export type AlertKind = "DIVERGENCE" | "CORPORATE_ACTION" | "SMART_MONEY";

export interface Alert {
  kind: AlertKind;
  symbol: string;
  title: Message;
  /** Body parts, written to read naturally joined with spaces. */
  body: Message[];
  /** Strength of the signal, used to order a digest. */
  priority: number;
  payload: Record<string, unknown>;
}

export interface WatchState {
  symbol: string;
  zScoreThreshold: number;
  notifyOnCorporateAction: boolean;
  notifyOnSmartMoney: boolean;
  lastNotifiedAt: Date | null;
  lastNotifiedZ: number | null;
}

/** Minimum gap between divergence alerts for the same symbol. */
export const COOLDOWN_HOURS = 20;

/**
 * How much the z-score must move before a repeat alert is justified.
 *
 * Without this, a stock oscillating around its threshold fires on every run.
 */
export const MATERIAL_Z_CHANGE = 0.75;

/** Days ahead that a corporate action becomes worth flagging. */
export const ACTION_HORIZON_DAYS = 14;

export function evaluateDivergenceAlert(
  state: WatchState,
  shadow: ShadowAnalysis,
  reality: RealityCheck,
  now = new Date(),
): Alert | null {
  // A divergence measured against a twin that explains almost nothing is not a
  // finding, and alerting on it would be the product contradicting itself.
  if (shadow.fitQuality < 0.3) return null;
  if (shadow.constituents.length < 3) return null;

  const z = shadow.zScore;
  if (Math.abs(z) < state.zScoreThreshold) return null;

  if (state.lastNotifiedAt) {
    const hoursSince =
      (now.getTime() - state.lastNotifiedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSince < COOLDOWN_HOURS) return null;

    // Past the cooldown, still require the situation to have changed.
    if (
      state.lastNotifiedZ !== null &&
      Math.abs(z - state.lastNotifiedZ) < MATERIAL_Z_CHANGE
    ) {
      return null;
    }
  }

  const direction = shadow.attribution.idiosyncratic >= 0 ? "above" : "below";
  const directionKey = direction === "above" ? "alert.direction.above" : "alert.direction.below";
  const magnitude = (Math.abs(shadow.attribution.idiosyncratic) * 100).toFixed(1);

  return {
    kind: "DIVERGENCE",
    symbol: shadow.symbol,
    title: msg("alert.divergenceTitle", {
      symbol: shadow.symbol,
      magnitude,
      direction: msg(directionKey),
    }),
    body: buildDivergenceBody(shadow, reality, directionKey, magnitude),
    priority: Math.abs(z),
    payload: {
      zScore: z,
      idiosyncratic: shadow.attribution.idiosyncratic,
      fitQuality: shadow.fitQuality,
      verdict: shadow.verdict,
      realityVerdict: reality.verdict,
    },
  };
}

function buildDivergenceBody(
  shadow: ShadowAnalysis,
  reality: RealityCheck,
  directionKey: "alert.direction.above" | "alert.direction.below",
  magnitude: string,
): Message[] {
  const parts: Message[] = [];

  parts.push(
    msg("alert.divergenceSummary", {
      symbol: shadow.symbol,
      magnitude,
      direction: msg(directionKey),
      peerCount: shadow.constituents.length,
      zScore: shadow.zScore.toFixed(2),
    }),
  );

  // The reality check is the most useful line in an alert, because it says
  // whether anyone has publicly explained the move yet.
  const realityKey: Record<RealityCheck["verdict"], Message["key"]> = {
    price_ahead_of_narrative: "alert.reality.priceAhead",
    contradiction: "alert.reality.contradiction",
    confirmed: "alert.reality.confirmed",
    narrative_ahead_of_price: "alert.reality.narrativeAhead",
    insufficient_evidence: "alert.reality.insufficient",
  };
  parts.push(msg(realityKey[reality.verdict]));

  parts.push(
    msg("alert.fitAndConfidence", {
      fitPct: (shadow.fitQuality * 100).toFixed(0),
      confidence: reality.confidence,
    }),
  );

  return parts;
}

export function evaluateCorporateActionAlerts(
  state: WatchState,
  actions: CorporateActionItem[],
  now = new Date(),
): Alert[] {
  if (!state.notifyOnCorporateAction) return [];

  const horizon = now.getTime() + ACTION_HORIZON_DAYS * 24 * 60 * 60 * 1000;

  return actions
    .filter((action) => {
      if (action.timing !== "upcoming") return false;
      const when = Date.parse(`${action.date}T00:00:00Z`);
      return !Number.isNaN(when) && when <= horizon;
    })
    .map((action) => ({
      kind: "CORPORATE_ACTION" as const,
      symbol: state.symbol,
      title: msg("alert.actionTitle", {
        symbol: state.symbol,
        summary: action.summary,
        date: action.date,
      }),
      body: buildActionBody(action),
      // Below divergence alerts: a scheduled event is known in advance, while
      // an unexplained price move is new information.
      priority: 0.5,
      payload: { kind: action.kind, date: action.date },
    }));
}

function buildActionBody(action: CorporateActionItem): Message[] {
  const parts: Message[] = [action.summary];

  if (action.effect?.cashIdr) {
    parts.push(
      msg("alert.actionDueCash", { amount: formatIdr(Math.round(action.effect.cashIdr)) }),
    );
  }
  if (action.effect?.sharesAfter && action.effect.adjustedAvgPrice) {
    parts.push(
      msg("alert.actionBecomesShares", {
        shares: action.effect.sharesAfter.toLocaleString("id-ID"),
        price: formatIdr(Math.round(action.effect.adjustedAvgPrice)),
      }),
    );
  }
  if (action.detail) parts.push(action.detail);

  return parts;
}

/**
 * Orders alerts for a digest and caps the count.
 *
 * A digest of fifteen items is a wall of text that gets archived unread, so it
 * is truncated with an honest count of what was left out.
 */
export function buildDigest(
  alerts: Alert[],
  limit = 5,
): { alerts: Alert[]; omitted: number } {
  const sorted = [...alerts].sort((a, b) => b.priority - a.priority);
  return {
    alerts: sorted.slice(0, limit),
    omitted: Math.max(0, sorted.length - limit),
  };
}
