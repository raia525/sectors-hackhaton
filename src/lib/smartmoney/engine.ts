import { clamp } from "@/lib/shadow/stats";
import type { DailyBar } from "@/lib/shadow/types";
import { msg, type Message } from "@/lib/i18n/message";
import type {
  DivergenceType,
  FlowDirection,
  FlowSummary,
  ForeignFlowPoint,
  OwnershipShift,
  OwnershipSnapshot,
  SmartMoneySignal,
} from "./types";

/**
 * Detects disagreement between institutional/foreign positioning and price.
 *
 * The reasoning: price is set by marginal supply and demand, while ownership
 * and foreign flow reveal who is actually taking the other side. When a stock
 * drifts down while foreign money and institutions accumulate, the sellers are
 * likely retail or index-driven, and the accumulation is information the price
 * has not yet reflected. The reverse pattern, price rising into institutional
 * distribution, is the classic distribution warning.
 *
 * Every threshold below is a stated assumption rather than a fitted parameter.
 * Nothing here is backtested, so the output is framed as an observation about
 * positioning, never as a prediction.
 */

/** Net flow below this share of traded value is treated as noise. */
const FLOW_NOISE_FLOOR = 0.01;
/** Institutional share change below this is within reporting noise. */
const OWNERSHIP_NOISE_FLOOR_PP = 0.3;
/** Minimum sessions of flow data before a summary is meaningful. */
const MIN_FLOW_SESSIONS = 10;

export function summarizeForeignFlow(
  flow: ForeignFlowPoint[],
  bars: DailyBar[],
): FlowSummary {
  const usable = flow.filter((f) => Number.isFinite(f.netInflow));
  if (usable.length === 0) {
    return {
      direction: "neutral",
      netIdr: 0,
      intensity: 0,
      streak: 0,
      positiveSessionShare: 0,
    };
  }

  const netIdr = usable.reduce((sum, f) => sum + f.netInflow, 0);

  // Normalise by traded value so a large-cap and a small-cap are comparable.
  const tradedValue = bars.reduce((sum, b) => sum + b.close * b.volume, 0);
  const intensity = tradedValue > 0 ? netIdr / tradedValue : 0;

  const positives = usable.filter((f) => f.netInflow > 0).length;
  const positiveSessionShare = positives / usable.length;

  // Streak measured backwards from the most recent session.
  const ordered = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const lastSign = Math.sign(ordered.at(-1)?.netInflow ?? 0);
  let streak = 0;
  if (lastSign !== 0) {
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      if (Math.sign(ordered[i].netInflow) !== lastSign) break;
      streak += 1;
    }
  }

  let direction: FlowDirection = "neutral";
  if (Math.abs(intensity) >= FLOW_NOISE_FLOOR) {
    direction = intensity > 0 ? "accumulating" : "distributing";
  }

  return { direction, netIdr, intensity, streak, positiveSessionShare };
}

/**
 * Compares the earliest and latest ownership snapshots.
 *
 * Share of outstanding is used rather than absolute share counts, so a rights
 * issue or stock split does not read as a change in conviction.
 */
export function summarizeOwnership(
  snapshots: OwnershipSnapshot[],
): OwnershipShift | null {
  const usable = snapshots
    .filter((s) => (s.sharesOutstanding ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (usable.length < 2) return null;

  const first = usable[0];
  const last = usable.at(-1) as OwnershipSnapshot;

  const share = (s: OwnershipSnapshot, institutional: boolean): number => {
    const total = s.sharesOutstanding as number;
    const held = institutional
      ? s.institutionalLocal + s.institutionalForeign
      : s.individualLocal + s.individualForeign;
    return (held / total) * 100;
  };

  const shareChangePp = share(last, true) - share(first, true);
  const retailShareChangePp = share(last, false) - share(first, false);

  let direction: FlowDirection = "neutral";
  if (Math.abs(shareChangePp) >= OWNERSHIP_NOISE_FLOOR_PP) {
    direction = shareChangePp > 0 ? "accumulating" : "distributing";
  }

  return {
    direction,
    shareChangePp,
    months: usable.length,
    retailShareChangePp,
  };
}

/** Classifies the relationship between price direction and smart money flow. */
export function classifyDivergence(
  priceReturn: number,
  flow: FlowDirection,
  ownership: FlowDirection | null,
): DivergenceType {
  // Ownership moves slowly and is the higher-quality signal when the two
  // disagree, so it takes precedence.
  const smart: FlowDirection =
    ownership && ownership !== "neutral" ? ownership : flow;

  if (smart === "neutral") return "no_signal";

  const priceUp = priceReturn > 0.01;
  const priceDown = priceReturn < -0.01;

  if (priceDown && smart === "accumulating") return "bullish_divergence";
  if (priceUp && smart === "distributing") return "bearish_divergence";
  if (priceUp && smart === "accumulating") return "confirmation_up";
  if (priceDown && smart === "distributing") return "confirmation_down";
  return "no_signal";
}

/**
 * Conviction score in [0,100].
 *
 * Scores how *strong and consistent* the observed disagreement is. Divergence
 * patterns score higher than confirmation because agreement between price and
 * flow is the ordinary case and carries little information; disagreement is
 * the rarer, more actionable observation.
 */
export function computeConviction(
  type: DivergenceType,
  flow: FlowSummary,
  ownership: OwnershipShift | null,
  priceReturn: number,
): number {
  if (type === "no_signal") return 0;

  // Divergence is the informative pattern, so it starts from a higher base.
  const isDivergence =
    type === "bullish_divergence" || type === "bearish_divergence";
  let score = isDivergence ? 40 : 20;

  // Flow intensity, saturating at 5% of traded value.
  score += clamp(Math.abs(flow.intensity) / 0.05, 0, 1) * 20;

  // Persistence: a sustained one-way streak is harder to dismiss as noise.
  score += clamp(flow.streak / 10, 0, 1) * 10;

  // Consistency: how lopsided the sessions were.
  const lopsided = Math.abs(flow.positiveSessionShare - 0.5) * 2;
  score += lopsided * 10;

  // Ownership confirmation, the slowest and most deliberate signal.
  if (ownership && ownership.direction !== "neutral") {
    score += clamp(Math.abs(ownership.shareChangePp) / 3, 0, 1) * 15;

    // Institutions and retail moving opposite ways sharpens the read: someone
    // is taking the other side of the crowd.
    const opposed =
      Math.sign(ownership.shareChangePp) !== Math.sign(ownership.retailShareChangePp);
    if (opposed && Math.abs(ownership.retailShareChangePp) > OWNERSHIP_NOISE_FLOOR_PP) {
      score += 5;
    }
  }

  // A larger price move against the flow makes the disagreement starker.
  if (isDivergence) {
    score += clamp(Math.abs(priceReturn) / 0.15, 0, 1) * 5;
  }

  return Math.round(clamp(score, 0, 100));
}

export interface SmartMoneyInput {
  symbol: string;
  bars: DailyBar[];
  foreignFlow: ForeignFlowPoint[];
  ownership: OwnershipSnapshot[];
}

export function analyzeSmartMoney(input: SmartMoneyInput): SmartMoneySignal {
  const { symbol, bars, foreignFlow, ownership } = input;
  const caveats: Message[] = [];
  const findings: Message[] = [];

  const sortedBars = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const first = sortedBars[0];
  const last = sortedBars.at(-1);
  const priceReturn =
    first && last && first.close > 0 ? last.close / first.close - 1 : 0;

  const flow = summarizeForeignFlow(foreignFlow, sortedBars);
  const ownershipShift = summarizeOwnership(ownership);

  const insufficientData =
    sortedBars.length < MIN_FLOW_SESSIONS ||
    (foreignFlow.length < MIN_FLOW_SESSIONS && ownershipShift === null);

  if (insufficientData) {
    caveats.push(msg("smartmoney.caveat.insufficientData"));
    return {
      symbol,
      asOf: last?.date ?? "",
      type: "no_signal",
      conviction: 0,
      priceReturn,
      foreignFlow: flow,
      ownership: ownershipShift,
      findings,
      caveats,
      insufficientData: true,
    };
  }

  const type = classifyDivergence(priceReturn, flow.direction, ownershipShift?.direction ?? null);
  const conviction = computeConviction(type, flow, ownershipShift, priceReturn);

  // Raw numbers travel in the message params; the render layer formats them
  // (currency, percent) in the viewer's locale rather than the engine baking
  // in an English-formatted string.
  findings.push(
    msg("smartmoney.summaryLine", {
      priceReturn,
      flowValue: flow.netIdr,
      flowIntensity: flow.intensity,
    }),
  );

  if (ownershipShift) {
    findings.push(
      msg("smartmoney.ownershipLine", {
        shareChange: ownershipShift.shareChangePp.toFixed(2),
        months: ownershipShift.months,
        retailChange: ownershipShift.retailShareChangePp.toFixed(2),
      }),
    );
  }

  const typeMessageKey = {
    bullish_divergence: "smartmoney.meaning.bullish",
    bearish_divergence: "smartmoney.meaning.bearish",
    confirmation_up: "smartmoney.meaning.confirmedUp",
    confirmation_down: "smartmoney.meaning.confirmedDown",
    no_signal: "smartmoney.meaning.none",
  } as const;
  findings.push(msg(typeMessageKey[type]));

  caveats.push(msg("smartmoney.caveat.scope"));
  caveats.push(msg("smartmoney.caveat.notForecast"));
  if (ownershipShift === null) {
    caveats.push(msg("smartmoney.caveat.flowOnly"));
  }
  if (flow.streak <= 2 && ownershipShift === null) {
    caveats.push(msg("smartmoney.caveat.notPersistent"));
  }

  return {
    symbol,
    asOf: last?.date ?? "",
    type,
    conviction,
    priceReturn,
    foreignFlow: flow,
    ownership: ownershipShift,
    findings,
    caveats,
    insufficientData: false,
  };
}
