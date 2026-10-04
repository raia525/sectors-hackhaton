import { formatIdr, formatPercent, formatSigned } from "@/lib/format";
import { msg, type Message } from "@/lib/i18n/message";
import type { Brief } from "./brief";
import { SHIPPED_BARS, type Bars, type TrackRecord } from "./track-record";

/**
 * Conclusions: the one sentence a reader should leave with, and the few
 * points that back it, for each page that shows an analysis.
 *
 * Like the narrative card, nothing here is a new claim. Every sentence is
 * picked by a rule from figures the engines already produced, and when the
 * evidence is too weak to conclude, the conclusion is that refusal, said
 * first rather than tucked under a confident headline (AGENTS.md,
 * non-negotiable 1).
 *
 * Inputs are plain numbers rather than engine objects so the same rules
 * serve a live analysis, a stored snapshot and the chatbot's tools.
 */

/** Below this |z| the move is ordinary. Matches the engine's "moderate" line. */
const NOTICEABLE_Z = 1;

export type ConclusionTone = "signal" | "watch" | "calm" | "refused";

export interface Conclusion {
  tone: ConclusionTone;
  headline: Message;
  points: Message[];
}

export interface StockFacts {
  symbol: string;
  sessions: number;
  zScore: number;
  fitQuality: number;
  peers: number;
  total: number;
  market: number;
  sector: number;
  idio: number;
  /** AlignmentVerdict from the reality check. */
  realityVerdict: string;
  /** Upcoming corporate actions, soonest first. */
  upcoming: { kind: "dividend" | "stock_split" | "agm"; date: string }[];
}

const pct = (v: number) => formatPercent(v);
const fitPct = (v: number) => `${Math.round(v * 100)}%`;

export function concludeStock(f: StockFacts, bars: Bars = SHIPPED_BARS): Conclusion {
  if (f.peers < bars.minPeers) {
    return {
      tone: "refused",
      headline: msg("conclusion.refused.peers", { symbol: f.symbol, count: f.peers, min: bars.minPeers }),
      points: [msg("conclusion.point.happened", happenedParams(f))],
    };
  }
  if (f.fitQuality < bars.fitFloor) {
    return {
      tone: "refused",
      headline: msg("conclusion.refused.fit", { symbol: f.symbol, fit: fitPct(f.fitQuality) }),
      points: [msg("conclusion.point.happened", happenedParams(f))],
    };
  }

  const z = Math.abs(f.zScore);
  const params = { symbol: f.symbol, specific: pct(f.idio), z: z.toFixed(1), total: pct(f.total) };
  let tone: ConclusionTone;
  let headline: Message;
  if (z >= bars.signalZ) {
    tone = "signal";
    headline = msg(f.zScore > 0 ? "conclusion.signal.up" : "conclusion.signal.down", params);
  } else if (z >= NOTICEABLE_Z) {
    tone = "watch";
    headline = msg("conclusion.watch", params);
  } else {
    tone = "calm";
    headline = msg("conclusion.calm", params);
  }

  return {
    tone,
    headline,
    points: [
      msg("conclusion.point.happened", happenedParams(f)),
      msg("conclusion.point.unusual", { z: formatSigned(f.zScore, 1), fit: fitPct(f.fitQuality), peers: f.peers }),
      newsPoint(f.realityVerdict),
      watchPoint(f.upcoming),
    ],
  };
}

function happenedParams(f: StockFacts) {
  return {
    sessions: f.sessions,
    total: pct(f.total),
    market: pct(f.market),
    sector: pct(f.sector),
    specific: pct(f.idio),
  };
}

const NEWS_KEYS = {
  confirmed: "conclusion.point.news.confirmed",
  contradiction: "conclusion.point.news.contradiction",
  narrative_ahead_of_price: "conclusion.point.news.narrativeAhead",
  price_ahead_of_narrative: "conclusion.point.news.priceAhead",
  insufficient_evidence: "conclusion.point.news.insufficient",
} as const;

function newsPoint(verdict: string): Message {
  return msg(NEWS_KEYS[verdict as keyof typeof NEWS_KEYS] ?? NEWS_KEYS.insufficient_evidence);
}

const ACTION_KEYS = {
  dividend: "conclusion.action.dividend",
  stock_split: "conclusion.action.split",
  agm: "conclusion.action.agm",
} as const;

function watchPoint(upcoming: StockFacts["upcoming"]): Message {
  const [next] = upcoming;
  if (!next) return msg("conclusion.point.watchNone");
  return msg("conclusion.point.watch", {
    count: upcoming.length,
    action: msg(ACTION_KEYS[next.kind]),
    date: next.date,
  });
}

export interface RunFacts {
  runDate: string;
  inProgress: boolean;
  done: number;
  queued: number;
  skipped: number;
  failed: number;
  creditsSpent: number;
  creditCap: number;
}

/** The market page's opening paragraph, built from the day's brief. */
export function concludeMarket(brief: Brief, run: RunFacts, bars: Bars = SHIPPED_BARS): Conclusion {
  const points: Message[] = [];
  if (run.inProgress) {
    points.push(msg("conclusion.market.inProgress", { done: run.done, total: run.queued }));
  } else if (run.skipped + run.failed > 0) {
    points.push(msg("conclusion.market.partial", { skipped: run.skipped, failed: run.failed }));
  }

  if (brief.covered === 0) {
    return { tone: "refused", headline: msg("conclusion.market.empty", { date: run.runDate }), points };
  }

  const [top] = brief.movers;
  const headline =
    brief.signalCount > 0 && top
      ? msg("conclusion.market.signals", {
          count: brief.signalCount,
          covered: brief.covered,
          symbol: top.symbol,
          specific: pct(top.idioReturn),
          z: formatSigned(top.zScore, 1),
        })
      : msg("conclusion.market.quiet", { covered: brief.covered, z: bars.signalZ });

  const [sector] = brief.sectors;
  if (sector) {
    points.push(msg("conclusion.market.sector", { sector: sector.sector, specific: pct(sector.avgIdio), count: sector.count }));
  }
  if (brief.disagreements.length > 0) {
    points.push(
      msg("conclusion.market.disagreements", {
        count: brief.disagreements.length,
        symbols: brief.disagreements.map((d) => d.symbol).join(", "),
      }),
    );
  }
  if (brief.unreliable.length > 0) {
    points.push(msg("conclusion.market.unreliable", { count: brief.unreliable.length }));
  }
  points.push(msg("conclusion.market.credits", { spent: run.creditsSpent, cap: run.creditCap }));

  return { tone: brief.signalCount > 0 ? "signal" : "calm", headline, points };
}

export interface CompareRow {
  symbol: string;
  zScore: number;
  idiosyncratic: number;
  fitQuality: number;
}

/** Compare: who is moving on their own, and who is moving with the group. */
export function concludeCompare(ranked: CompareRow[], bars: Bars = SHIPPED_BARS): Conclusion | null {
  const usable = ranked.filter((r) => r.fitQuality >= bars.fitFloor);
  const weak = ranked.filter((r) => r.fitQuality < bars.fitFloor).map((r) => r.symbol);
  const points: Message[] = [];
  if (weak.length > 0) points.push(msg("conclusion.compare.weak", { symbols: weak.join(", ") }));

  const [top] = usable;
  if (!top) {
    return { tone: "refused", headline: msg("conclusion.compare.none"), points };
  }
  const bottom = usable.length > 1 ? usable.at(-1) : undefined;
  if (bottom) {
    points.unshift(msg("conclusion.compare.bottom", { symbol: bottom.symbol, z: formatSigned(bottom.zScore, 1) }));
  }
  const signal = Math.abs(top.zScore) >= bars.signalZ;
  return {
    tone: signal ? "signal" : "calm",
    headline: msg(signal ? "conclusion.compare.signal" : "conclusion.compare.calm", {
      symbol: top.symbol,
      specific: pct(top.idiosyncratic),
      z: formatSigned(top.zScore, 1),
    }),
    points,
  };
}

export interface PortfolioFacts {
  watched: number;
  /** Watched stocks whose latest stored analysis clears the signal bars. */
  signalling: string[];
  /** Watched stocks with no stored analysis yet. */
  notCovered: number;
  unreadAlerts: number;
  upcomingActions: number;
  /** Cash from upcoming dividends on the user's holdings, in IDR. */
  upcomingIncome: number;
}

export function concludePortfolio(f: PortfolioFacts): Conclusion {
  if (f.watched === 0) {
    return { tone: "refused", headline: msg("conclusion.portfolio.empty"), points: [] };
  }
  const points: Message[] = [];
  if (f.unreadAlerts > 0) points.push(msg("conclusion.portfolio.alerts", { count: f.unreadAlerts }));
  if (f.upcomingActions > 0) {
    points.push(
      f.upcomingIncome > 0
        ? msg("conclusion.portfolio.income", { count: f.upcomingActions, amount: formatIdr(f.upcomingIncome) })
        : msg("conclusion.portfolio.actions", { count: f.upcomingActions }),
    );
  }
  if (f.notCovered > 0) points.push(msg("conclusion.portfolio.notCovered", { count: f.notCovered }));

  return f.signalling.length > 0
    ? {
        tone: "signal",
        headline: msg("conclusion.portfolio.signals", {
          count: f.signalling.length,
          watched: f.watched,
          symbols: f.signalling.join(", "),
        }),
        points,
      }
    : { tone: "calm", headline: msg("conclusion.portfolio.quiet", { watched: f.watched }), points };
}

/** The track record in one sentence; a refusal below the minimum sample. */
export function concludeTrackRecord(record: TrackRecord): Conclusion {
  const { signals, ordinary } = record;
  if (!record.enough || signals.continuedShare === null) {
    return {
      tone: "refused",
      headline: msg("conclusion.track.notEnough", { count: signals.count, min: record.minSample }),
      points: [],
    };
  }
  const signalPct = Math.round(signals.continuedShare * 100);
  const ordinaryPct = ordinary.continuedShare === null ? null : Math.round(ordinary.continuedShare * 100);
  const points: Message[] =
    ordinaryPct === null
      ? []
      : [msg("conclusion.track.compare", { signal: `${signalPct}%`, ordinary: `${ordinaryPct}%` })];
  return {
    tone: "calm",
    headline: msg("conclusion.track.result", { count: signals.count, share: `${signalPct}%` }),
    points,
  };
}
