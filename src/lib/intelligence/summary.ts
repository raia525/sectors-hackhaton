import { formatIdr, formatPercent, formatSigned } from "@/lib/format";
import { msg, type Message } from "@/lib/i18n/message";
import type { Brief } from "./brief";
import type { WatchFacts } from "./watch-facts";
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

/** Quarterly YoY growth beyond this, either way, is worth naming. */
export const SHARP_GROWTH = 0.2;
/** Within this share of the 52-week range counts as near the high or low. */
export const RANGE_EDGE = 0.1;
/** Volume at least this many times the 20-day average is unusual. */
export const VOLUME_SPIKE = 2;
/** Items named per point before "and N more". */
const LIST_LIMIT = 3;

export interface PortfolioFacts {
  watched: number;
  /** Watched stocks whose latest stored analysis clears the signal bars. */
  signalling: string[];
  /** Watched stocks with no stored analysis yet. */
  notCovered: string[];
  /** Unread alerts about stocks still on the watchlist. */
  unreadAlerts: number;
  actions: { symbol: string; kind: "dividend" | "stock_split" | "agm"; date: string; cashIdr: number | null }[];
  actionDays: number;
  /** Dividends due on the user's holdings in that window, in IDR. */
  upcomingIncome: number;
  /** Watched stocks with a sharp quarterly change in earnings or revenue. */
  financial: { symbol: string; earningsGrowth: number | null; revenueGrowth: number | null }[];
  /** Watched stocks with any quarterly figure known, sharp or not. */
  financialKnown: number;
  nearHigh: string[];
  nearLow: string[];
  volumeSpikes: { symbol: string; ratio: number }[];
  /** Watched stocks with a custom rule that fired recently. */
  rulesTriggered: string[];
  /** Latest data date among the watched stocks. */
  asOf: string | null;
}

/**
 * Builds the watchlist facts from each watched stock's stored analysis.
 * Every list is limited to `symbols`, the current watchlist, so nothing
 * about other stocks can enter the conclusion.
 */
export function portfolioFacts(input: {
  symbols: string[];
  stocks: { facts: WatchFacts; isSignal: boolean }[];
  unreadAlerts: number;
  actions: PortfolioFacts["actions"];
  rulesTriggered: string[];
  actionDays: number;
}): PortfolioFacts {
  const watched = new Set(input.symbols);
  const stocks = input.stocks.filter((s) => watched.has(s.facts.symbol));
  const actions = input.actions
    .filter((a) => watched.has(a.symbol))
    .sort((a, b) => a.date.localeCompare(b.date));

  const financial = stocks
    .filter(({ facts: { stats } }) =>
      [stats.earningsGrowth, stats.revenueGrowth].some((g) => g !== null && Math.abs(g) >= SHARP_GROWTH),
    )
    .map(({ facts }) => ({
      symbol: facts.symbol,
      earningsGrowth: facts.stats.earningsGrowth,
      revenueGrowth: facts.stats.revenueGrowth,
    }));

  const asOf = stocks.reduce<string | null>((max, s) => (max === null || s.facts.runDate > max ? s.facts.runDate : max), null);

  return {
    watched: watched.size,
    signalling: stocks.filter((s) => s.isSignal).map((s) => s.facts.symbol),
    notCovered: input.symbols.filter((sym) => !stocks.some((s) => s.facts.symbol === sym)).sort(),
    unreadAlerts: input.unreadAlerts,
    actions,
    actionDays: input.actionDays,
    upcomingIncome: actions.reduce((sum, a) => sum + (a.cashIdr ?? 0), 0),
    financial,
    financialKnown: stocks.filter((s) => s.facts.stats.earningsGrowth !== null || s.facts.stats.revenueGrowth !== null).length,
    nearHigh: stocks.filter((s) => s.facts.stats.rangePosition !== null && s.facts.stats.rangePosition >= 1 - RANGE_EDGE).map((s) => s.facts.symbol),
    nearLow: stocks.filter((s) => s.facts.stats.rangePosition !== null && s.facts.stats.rangePosition <= RANGE_EDGE).map((s) => s.facts.symbol),
    volumeSpikes: stocks
      .filter((s) => (s.facts.prices?.volumeRatio ?? 0) >= VOLUME_SPIKE)
      .map((s) => ({ symbol: s.facts.symbol, ratio: s.facts.prices?.volumeRatio ?? 0 })),
    rulesTriggered: [...new Set(input.rulesTriggered.filter((s) => watched.has(s)))],
    asOf,
  };
}

const ACTION_NAME = {
  dividend: "conclusion.action.dividend",
  stock_split: "conclusion.action.split",
  agm: "conclusion.action.agm",
} as const;

const more = (count: number): Message | null => (count > LIST_LIMIT ? msg("conclusion.more", { count: count - LIST_LIMIT }) : null);

export function concludePortfolio(f: PortfolioFacts): Conclusion {
  if (f.watched === 0) {
    return { tone: "refused", headline: msg("conclusion.portfolio.empty"), points: [] };
  }
  const points: Message[] = [];

  if (f.unreadAlerts > 0) points.push(msg("conclusion.portfolio.alerts", { count: f.unreadAlerts }));
  if (f.rulesTriggered.length > 0) {
    points.push(msg("conclusion.portfolio.rules", { count: f.rulesTriggered.length, symbols: f.rulesTriggered.join(", ") }));
  }

  // Corporate actions, soonest first, with the rupiah due on a holding.
  for (const a of f.actions.slice(0, LIST_LIMIT)) {
    points.push(
      a.cashIdr
        ? msg("conclusion.portfolio.actionCash", { symbol: a.symbol, action: msg(ACTION_NAME[a.kind]), date: a.date, amount: formatIdr(a.cashIdr) })
        : msg("conclusion.portfolio.action", { symbol: a.symbol, action: msg(ACTION_NAME[a.kind]), date: a.date }),
    );
  }
  const moreActions = more(f.actions.length);
  if (moreActions) points.push(moreActions);
  if (f.actions.length === 0 && f.watched > f.notCovered.length) {
    points.push(msg("conclusion.portfolio.noActions", { days: f.actionDays }));
  }

  // Financial reports: the latest quarter against the same quarter a year
  // earlier, named only when the change is sharp.
  for (const r of f.financial.slice(0, LIST_LIMIT)) {
    points.push(
      msg("conclusion.portfolio.financial", {
        symbol: r.symbol,
        earnings: r.earningsGrowth === null ? "-" : formatPercent(r.earningsGrowth, 1),
        revenue: r.revenueGrowth === null ? "-" : formatPercent(r.revenueGrowth, 1),
      }),
    );
  }
  const moreFinancial = more(f.financial.length);
  if (moreFinancial) points.push(moreFinancial);
  if (f.financial.length === 0 && f.financialKnown > 0) {
    points.push(msg("conclusion.portfolio.financialSteady", { count: f.financialKnown }));
  }

  if (f.nearHigh.length > 0) points.push(msg("conclusion.portfolio.nearHigh", { symbols: f.nearHigh.join(", ") }));
  if (f.nearLow.length > 0) points.push(msg("conclusion.portfolio.nearLow", { symbols: f.nearLow.join(", ") }));
  if (f.volumeSpikes.length > 0) {
    points.push(
      msg("conclusion.portfolio.volume", {
        list: f.volumeSpikes.map((v) => `${v.symbol} ${v.ratio.toFixed(1)}x`).join(", "),
      }),
    );
  }
  if (f.notCovered.length > 0) {
    points.push(msg("conclusion.portfolio.notCovered", { count: f.notCovered.length, symbols: f.notCovered.join(", ") }));
  }

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
