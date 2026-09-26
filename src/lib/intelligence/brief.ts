import { FIT_FLOOR, isSignal, MIN_PEERS } from "./track-record";

/**
 * The daily market brief, built from the day's stored analyses.
 *
 * It covers only the stocks that were analysed that day, and says how many,
 * because "the market" would be a claim the data cannot support: the run
 * covers watched stocks plus a short default list, limited by the credit
 * budget, not the whole exchange.
 *
 * A stock whose twin fits poorly is kept out of every ranking and listed
 * separately with that reason, rather than quietly dropped or quietly ranked.
 */

export interface BriefRow {
  symbol: string;
  companyName: string;
  sector: string | null;
  zScore: number;
  verdict: string;
  fitQuality: number;
  constituentCount: number;
  totalReturn: number;
  marketReturn: number;
  sectorReturn: number;
  idioReturn: number;
  realityVerdict: string;
  smartMoneyType: string | null;
  smartMoneyConviction: number | null;
}

/**
 * Smart money conviction worth listing. Conviction scores how strongly flow
 * and price disagree, not a probability; below this the disagreement is too
 * faint to single out.
 */
export const SMART_MONEY_MIN_CONVICTION = 40;

/** Stocks in a sector before a sector average is shown. */
export const MIN_SECTOR_SIZE = 2;

const DISAGREEMENT_VERDICTS = new Set(["contradiction", "price_ahead_of_narrative"]);
const SMART_MONEY_DIVERGENCES = new Set(["bullish_divergence", "bearish_divergence"]);

export interface SectorRow {
  sector: string;
  count: number;
  avgMarket: number;
  avgSector: number;
  avgIdio: number;
  signalCount: number;
}

export interface Brief {
  covered: number;
  /** Stocks with a twin good enough to rank. */
  reliable: number;
  /** Reliable stocks past the signal threshold. */
  signalCount: number;
  /** Reliable stocks, largest divergence first. */
  movers: BriefRow[];
  /** Reliable stocks where news and price disagree. */
  disagreements: BriefRow[];
  smartMoney: BriefRow[];
  sectors: SectorRow[];
  /** Sectors with a single analysed stock, too few to call a sector view. */
  singleStockSectors: string[];
  /** Stocks left out of the rankings because their twin fits poorly. */
  unreliable: BriefRow[];
}

export function isReliable(row: Pick<BriefRow, "fitQuality" | "constituentCount">): boolean {
  return row.fitQuality >= FIT_FLOOR && row.constituentCount >= MIN_PEERS;
}

export function buildBrief(rows: BriefRow[], limit = 5): Brief {
  const reliableRows = rows.filter(isReliable);
  const byDivergence = [...reliableRows].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  return {
    covered: rows.length,
    reliable: reliableRows.length,
    signalCount: reliableRows.filter(isSignal).length,
    movers: byDivergence.slice(0, limit),
    disagreements: byDivergence
      .filter((r) => DISAGREEMENT_VERDICTS.has(r.realityVerdict))
      .slice(0, limit),
    smartMoney: rows
      .filter(
        (r) =>
          r.smartMoneyType !== null &&
          SMART_MONEY_DIVERGENCES.has(r.smartMoneyType) &&
          (r.smartMoneyConviction ?? 0) >= SMART_MONEY_MIN_CONVICTION,
      )
      .sort((a, b) => (b.smartMoneyConviction ?? 0) - (a.smartMoneyConviction ?? 0))
      .slice(0, limit),
    ...buildSectors(reliableRows),
    unreliable: rows.filter((r) => !isReliable(r)),
  };
}

function buildSectors(rows: BriefRow[]): {
  sectors: SectorRow[];
  singleStockSectors: string[];
} {
  const groups = new Map<string, BriefRow[]>();
  for (const row of rows) {
    // A stock with no stated sector cannot be grouped, and inventing an
    // "Other" bucket would average together companies with nothing in common.
    if (!row.sector) continue;
    const group = groups.get(row.sector);
    if (group) group.push(row);
    else groups.set(row.sector, [row]);
  }

  const sectors: SectorRow[] = [];
  const singleStockSectors: string[] = [];

  for (const [sector, group] of groups) {
    if (group.length < MIN_SECTOR_SIZE) {
      singleStockSectors.push(sector);
      continue;
    }
    const mean = (pick: (r: BriefRow) => number) =>
      group.reduce((sum, r) => sum + pick(r), 0) / group.length;

    sectors.push({
      sector,
      count: group.length,
      avgMarket: mean((r) => r.marketReturn),
      avgSector: mean((r) => r.sectorReturn),
      avgIdio: mean((r) => r.idioReturn),
      signalCount: group.filter(isSignal).length,
    });
  }

  // The sector where company-specific moves dominate is the interesting one.
  sectors.sort((a, b) => Math.abs(b.avgIdio) - Math.abs(a.avgIdio));
  singleStockSectors.sort();
  return { sectors, singleStockSectors };
}
