import "server-only";
import { analyzeSymbol, AnalysisError, type AnalysisResult } from "./service";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { MAX_COMPARE } from "./constants";

/**
 * Side-by-side comparison of several stocks.
 *
 * The comparison is deliberately built on divergence rather than on raw
 * returns. Ranking stocks by performance tells you which sector did well;
 * ranking them by how far each has broken from its own twin tells you which
 * ones are doing something their peers are not, which is the comparison that
 * carries information.
 */

export { MAX_COMPARE };

export interface ComparisonRow {
  symbol: string;
  companyName: string;
  ok: true;
  totalReturn: number;
  idiosyncratic: number;
  marketComponent: number;
  sectorComponent: number;
  zScore: number;
  verdict: AnalysisResult["shadow"]["verdict"];
  fitQuality: number;
  peerCount: number;
  realityVerdict: AnalysisResult["realityCheck"]["verdict"];
  confidence: AnalysisResult["realityCheck"]["confidence"];
}

export interface ComparisonFailure {
  symbol: string;
  ok: false;
  reason: string;
}

export type ComparisonEntry = ComparisonRow | ComparisonFailure;

export interface ComparisonResult {
  entries: ComparisonEntry[];
  /** Symbols that produced a usable twin, ranked by absolute divergence. */
  ranked: ComparisonRow[];
  caveats: string[];
}

export function parseSymbols(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : input.split(",");

  const seen = new Set<string>();
  for (const item of raw) {
    const symbol = normalizeSymbol(item);
    if (symbol) seen.add(symbol);
    if (seen.size >= MAX_COMPARE) break;
  }
  return [...seen];
}

export async function compareSymbols(symbols: string[]): Promise<ComparisonResult> {
  // Sequential rather than concurrent: each analysis fetches a report and a
  // price series per peer, and firing four of those at once risks upstream
  // rate limiting on an account with a small credit allowance.
  const entries: ComparisonEntry[] = [];

  for (const symbol of symbols) {
    try {
      const result = await analyzeSymbol(symbol);
      const { shadow, realityCheck } = result;

      if (shadow.constituents.length === 0) {
        entries.push({
          symbol,
          ok: false,
          reason:
            shadow.warnings[0] ?? "No twin could be constructed for this stock.",
        });
        continue;
      }

      entries.push({
        symbol: result.symbol,
        companyName: result.companyName,
        ok: true,
        totalReturn: shadow.attribution.total,
        idiosyncratic: shadow.attribution.idiosyncratic,
        marketComponent: shadow.attribution.market,
        sectorComponent: shadow.attribution.sector,
        zScore: shadow.zScore,
        verdict: shadow.verdict,
        fitQuality: shadow.fitQuality,
        peerCount: shadow.constituents.length,
        realityVerdict: realityCheck.verdict,
        confidence: realityCheck.confidence,
      });
    } catch (error) {
      entries.push({
        symbol,
        ok: false,
        reason:
          error instanceof AnalysisError
            ? error.message
            : `Could not analyse ${symbol}.`,
      });
    }
  }

  const ranked = entries
    .filter((e): e is ComparisonRow => e.ok)
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  const caveats: string[] = [
    "Stocks are ranked by how far each has moved from its own twin, not by return. A large return that its peers also produced carries no information about the company.",
  ];

  const weak = ranked.filter((r) => r.fitQuality < 0.3);
  if (weak.length > 0) {
    caveats.push(
      `${weak.map((r) => r.symbol).join(", ")} ${weak.length === 1 ? "has a twin that explains" : "have twins that explain"} less than 30% of price variation, so ${weak.length === 1 ? "its" : "their"} divergence is indicative rather than conclusive.`,
    );
  }

  return { entries, ranked, caveats };
}
