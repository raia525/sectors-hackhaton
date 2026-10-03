import "server-only";
import { getSectorsClient } from "@/lib/sectors/server";
import { CreditExhaustedError, TTL } from "@/lib/sectors/client";
import {
  companyReportSchema,
  extractPeerSymbols,
  newsResponseSchema,
  parseDailySeries,
  parseForeignFlow,
  parseIndexSeries,
  parseOwnership,
  toPeerProfile,
} from "@/lib/sectors/schemas";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { buildShadow } from "@/lib/shadow/engine";
import type { DailyBar, PeerProfile, ShadowAnalysis } from "@/lib/shadow/types";
import { runRealityCheck, type RealityCheck } from "./reality-check";
import type { NewsItem } from "@/lib/sectors/schemas";
import {
  summarizeCorporateActions,
  upcomingIncome,
  type CorporateActionItem,
  type Position,
} from "./corporate-actions";
import { analyzeSeasonality, type SeasonalityResult } from "./seasonality";
import { buildKeyStats, type KeyStats } from "./key-stats";
import { analyzeSmartMoney } from "@/lib/smartmoney/engine";
import type { SmartMoneySignal } from "@/lib/smartmoney/types";
import { msg, type Message } from "@/lib/i18n/message";

/**
 * Assembles a complete analysis for one symbol.
 *
 * This is the only place that decides how many credits an analysis is worth
 * spending. The peer cap is the main lever: each peer costs one report section
 * plus one daily series, so a twin of eight peers costs roughly 18 credits on a
 * cold cache. Capping peers and requesting minimal report sections is what
 * makes repeated demo runs affordable inside a 1,000 credit budget.
 */

/** Peers fetched as candidates. Selection then narrows this further. */
export const MAX_PEER_CANDIDATES = 10;

/** Report sections needed for similarity scoring. Each costs one credit. */
const PROFILE_SECTIONS = ["overview", "financials", "dividend", "valuation"] as const;

export interface AnalysisResult {
  symbol: string;
  companyName: string;
  /** Null when the report does not state one. */
  sector: string | null;
  shadow: ShadowAnalysis;
  realityCheck: RealityCheck;
  news: NewsItem[];
  keyStats: KeyStats;
  seasonality: SeasonalityResult;
  corporateActions: CorporateActionItem[];
  /** Cash due from upcoming dividends, when the user holds a position. */
  upcomingIncomeIdr: number | null;
  /** Null when flow data was unavailable or too thin to score. */
  smartMoney: SmartMoneySignal | null;
  /** Non-fatal problems, including any peer that could not be fetched. */
  notices: Message[];
}

/** Optional extras, kept off the default path so they cost nothing unasked. */
export interface AnalyzeOptions {
  /** A holding, so corporate actions can be expressed in rupiah. */
  position?: Position | null;
  /**
   * Fetches foreign flow and ownership for the smart money signal. Costs two
   * extra credits, so it is opt-in rather than always on.
   */
  includeSmartMoney?: boolean;
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_symbol" | "no_data" | "credits_exhausted" | "upstream",
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

/** Fetches a company profile and its price history together. */
async function fetchProfileAndBars(
  symbol: string,
): Promise<{ profile: PeerProfile; bars: DailyBar[] }> {
  const client = getSectorsClient();

  const [reportRaw, dailyRaw] = await Promise.all([
    // Cached for a week: a peer's fundamentals only feed its similarity
    // score, so a slightly older figure changes nothing a viewer sees.
    client.companyReport(symbol, [...PROFILE_SECTIONS], { ttl: TTL.peerProfile }),
    client.dailyTransaction(symbol),
  ]);

  const report = companyReportSchema.parse(reportRaw);
  const { bars } = parseDailySeries(dailyRaw);

  return { profile: toPeerProfile(report), bars };
}

export async function analyzeSymbol(
  input: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const symbol = normalizeSymbol(input);
  if (!symbol) {
    throw new AnalysisError(
      `${input} is not a valid IDX ticker. Expected four letters, for example BBRI.`,
      "invalid_symbol",
    );
  }

  const client = getSectorsClient();
  const notices: Message[] = [];

  let targetReport;
  try {
    targetReport = companyReportSchema.parse(
      await client.companyReport(symbol, [...PROFILE_SECTIONS, "peers"]),
    );
  } catch (error) {
    if (error instanceof CreditExhaustedError) {
      throw new AnalysisError(error.message, "credits_exhausted");
    }
    throw new AnalysisError(
      `Could not load the company report for ${symbol}.`,
      "upstream",
    );
  }

  const targetProfile = toPeerProfile(targetReport);
  const { bars: targetBars } = parseDailySeries(await client.dailyTransaction(symbol));

  if (targetBars.length === 0) {
    throw new AnalysisError(
      `No price history available for ${symbol} in the last 90 days.`,
      "no_data",
    );
  }

  const peerSymbols = extractPeerSymbols(targetReport, symbol).slice(
    0,
    MAX_PEER_CANDIDATES,
  );
  if (peerSymbols.length === 0) {
    notices.push(msg("analysis.notice.noPeers", { symbol }));
  }

  // Peers are fetched concurrently but failures are tolerated individually: one
  // suspended ticker should not blank the whole analysis.
  const candidateResults = await Promise.allSettled(
    peerSymbols.map(async (peer) => ({ peer, ...(await fetchProfileAndBars(peer)) })),
  );

  const candidates: { profile: PeerProfile; bars: DailyBar[] }[] = [];
  for (let i = 0; i < candidateResults.length; i += 1) {
    const result = candidateResults[i];
    if (result.status === "fulfilled" && result.value.bars.length > 0) {
      candidates.push({ profile: result.value.profile, bars: result.value.bars });
    } else {
      notices.push(msg("analysis.notice.peerSkipped", { symbol: peerSymbols[i] }));
    }
  }

  // The index endpoint reports `price` rather than `close`, so it needs its
  // own parser; the stock parser would drop every row.
  const marketBars = parseIndexSeries(await client.indexDaily("ihsg"));
  if (marketBars.length === 0) {
    notices.push(msg("analysis.notice.indexUnavailable"));
  }

  const shadow = buildShadow({
    target: { profile: targetProfile, bars: targetBars },
    candidates,
    marketBars,
  });

  let news: NewsItem[] = [];
  try {
    const parsed = newsResponseSchema.parse(
      await client.news({ symbols: [symbol], limit: 20 }),
    );
    news = parsed.results;
  } catch {
    notices.push(msg("analysis.notice.newsUnavailable"));
  }

  // Corporate actions cost one credit. Seasonality and key stats derive from
  // data already fetched above, so they add nothing to the bill.
  let corporateActions: CorporateActionItem[] = [];
  try {
    corporateActions = summarizeCorporateActions(
      await client.corporateActions(symbol),
      options.position ?? null,
    );
  } catch {
    notices.push(msg("analysis.notice.actionsUnavailable"));
  }

  const smartMoney = options.includeSmartMoney
    ? await loadSmartMoney(symbol, targetBars, notices)
    : null;

  return {
    symbol,
    companyName: targetProfile.companyName,
    sector: targetProfile.sector,
    shadow,
    realityCheck: runRealityCheck(shadow, news),
    news,
    keyStats: buildKeyStats(targetReport, targetBars),
    seasonality: analyzeSeasonality(targetBars),
    corporateActions,
    upcomingIncomeIdr: options.position ? upcomingIncome(corporateActions) : null,
    smartMoney,
    notices,
  };
}

/**
 * Fetches flow and ownership for the smart money signal.
 *
 * Both calls are tolerated individually: ownership in particular is unavailable
 * for some tickers, and the engine already degrades to flow alone and says so
 * in its own caveats.
 */
async function loadSmartMoney(
  symbol: string,
  bars: DailyBar[],
  notices: Message[],
): Promise<SmartMoneySignal | null> {
  const client = getSectorsClient();

  const [flowResult, ownershipResult] = await Promise.allSettled([
    client.foreignFlow(symbol),
    client.shareholders(symbol, new Date().getUTCFullYear()),
  ]);

  const foreignFlow =
    flowResult.status === "fulfilled" ? parseForeignFlow(flowResult.value) : [];
  const ownership =
    ownershipResult.status === "fulfilled"
      ? parseOwnership(ownershipResult.value)
      : [];

  if (foreignFlow.length === 0 && ownership.length === 0) {
    notices.push(msg("analysis.notice.smartMoneyUnavailable"));
    return null;
  }

  return analyzeSmartMoney({ symbol, bars, foreignFlow, ownership });
}
