import { clamp } from "@/lib/shadow/stats";
import type { DailyBar } from "@/lib/shadow/types";
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
  const caveats: string[] = [];
  const findings: string[] = [];

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
    caveats.push(
      "Not enough flow or ownership history to score positioning. No signal is reported rather than a weak guess.",
    );
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

  const pricePct = (priceReturn * 100).toFixed(2);
  const flowBn = (flow.netIdr / 1_000_000_000).toFixed(1);

  findings.push(
    `Over the window the price moved ${pricePct}% while net foreign flow was ${flowBn} billion IDR, ${(flow.intensity * 100).toFixed(2)}% of traded value.`,
  );

  if (ownershipShift) {
    findings.push(
      `Institutional ownership changed by ${ownershipShift.shareChangePp.toFixed(2)} percentage points across ${ownershipShift.months} monthly snapshots, while retail changed by ${ownershipShift.retailShareChangePp.toFixed(2)}.`,
    );
  }

  switch (type) {
    case "bullish_divergence":
      findings.push(
        "Price fell while institutional and foreign money accumulated. Someone is buying what the market is selling.",
      );
      break;
    case "bearish_divergence":
      findings.push(
        "Price rose while institutional and foreign money reduced exposure. The rally is being sold into.",
      );
      break;
    case "confirmation_up":
      findings.push(
        "Price and smart money both point up, so positioning agrees with the move rather than contradicting it.",
      );
      break;
    case "confirmation_down":
      findings.push(
        "Price and smart money both point down; the decline is backed by real outflows, not thin trading.",
      );
      break;
    case "no_signal":
      findings.push(
        "Positioning and price are not far enough apart to call a divergence.",
      );
      break;
  }

  caveats.push(
    "Positioning is measured from foreign flow and institutional ownership categories. It does not include director or commissioner dealings, which this data source does not publish.",
  );
  caveats.push(
    "Conviction scores the strength of the observed disagreement, not the probability of a future return. These thresholds are stated assumptions, not backtested parameters.",
  );
  if (ownershipShift === null) {
    caveats.push(
      "No usable ownership snapshots, so the signal rests on foreign flow alone.",
    );
  }
  if (flow.streak <= 2 && ownershipShift === null) {
    caveats.push("Flow direction is not persistent, so it may be a single large trade.");
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
