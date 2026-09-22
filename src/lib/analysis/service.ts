import "server-only";
import { getSectorsClient } from "@/lib/sectors/server";
import { CreditExhaustedError } from "@/lib/sectors/client";
import {
  companyReportSchema,
  extractPeerSymbols,
  newsResponseSchema,
  parseDailySeries,
  toPeerProfile,
} from "@/lib/sectors/schemas";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { buildShadow } from "@/lib/shadow/engine";
import type { DailyBar, PeerProfile, ShadowAnalysis } from "@/lib/shadow/types";
import { runRealityCheck, type RealityCheck } from "./reality-check";
import type { NewsItem } from "@/lib/sectors/schemas";

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
const MAX_PEER_CANDIDATES = 10;

/** Report sections needed for similarity scoring. Each costs one credit. */
const PROFILE_SECTIONS = ["overview", "financials", "dividend", "valuation"] as const;

export interface AnalysisResult {
  symbol: string;
  companyName: string;
  shadow: ShadowAnalysis;
  realityCheck: RealityCheck;
  news: NewsItem[];
  /** Non-fatal problems, including any peer that could not be fetched. */
  notices: string[];
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
    client.companyReport(symbol, [...PROFILE_SECTIONS]),
    client.dailyTransaction(symbol),
  ]);

  const report = companyReportSchema.parse(reportRaw);
  const { bars } = parseDailySeries(dailyRaw);

  return { profile: toPeerProfile(report), bars };
}

export async function analyzeSymbol(input: string): Promise<AnalysisResult> {
  const symbol = normalizeSymbol(input);
  if (!symbol) {
    throw new AnalysisError(
      `${input} is not a valid IDX ticker. Expected four letters, for example BBRI.`,
      "invalid_symbol",
    );
  }

  const client = getSectorsClient();
  const notices: string[] = [];

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
    notices.push(
      `The company report for ${symbol} listed no peers, so no twin could be constructed.`,
    );
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
      notices.push(`Peer ${peerSymbols[i]} was skipped because its data could not be loaded.`);
    }
  }

  const { bars: marketBars } = parseDailySeries(await client.indexDaily("ihsg"));
  if (marketBars.length === 0) {
    notices.push(
      "IHSG history was unavailable, so the market component of the attribution is reported as zero.",
    );
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
    notices.push("Recent news could not be loaded, so the reality check uses price data only.");
  }

  return {
    symbol,
    companyName: targetProfile.companyName,
    shadow,
    realityCheck: runRealityCheck(shadow, news),
    news,
    notices,
  };
}
