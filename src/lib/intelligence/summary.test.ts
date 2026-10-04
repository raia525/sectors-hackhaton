import { describe, expect, it } from "vitest";
import {
  concludeCompare,
  concludeMarket,
  concludePortfolio,
  portfolioFacts,
  concludeStock,
  concludeTrackRecord,
  type RunFacts,
  type StockFacts,
} from "./summary";
import type { Brief, BriefRow } from "./brief";
import type { TrackRecord } from "./track-record";
import type { WatchFacts } from "./watch-facts";

const stock = (over: Partial<StockFacts> = {}): StockFacts => ({
  symbol: "BBRI",
  sessions: 60,
  zScore: 2.4,
  fitQuality: 0.6,
  peers: 5,
  total: 0.08,
  market: 0.01,
  sector: 0.02,
  idio: 0.05,
  realityVerdict: "confirmed",
  upcoming: [],
  ...over,
});

describe("concludeStock", () => {
  it("refuses before anything else when the twin has too few peers", () => {
    const c = concludeStock(stock({ peers: 2, zScore: 4 }));
    expect(c.tone).toBe("refused");
    expect(c.headline.key).toBe("conclusion.refused.peers");
    expect(c.headline.params).toMatchObject({ count: 2, min: 3 });
    // Only what happened is stated; nothing about how unusual it was.
    expect(c.points.map((p) => p.key)).toEqual(["conclusion.point.happened"]);
  });

  it("refuses when the twin fits too poorly, even for a large z", () => {
    const c = concludeStock(stock({ fitQuality: 0.2, zScore: 5 }));
    expect(c.tone).toBe("refused");
    expect(c.headline.key).toBe("conclusion.refused.fit");
    expect(c.headline.params).toMatchObject({ fit: "20%" });
  });

  it("calls a signal with its direction past the bar", () => {
    expect(concludeStock(stock({ zScore: 2.4 })).headline.key).toBe("conclusion.signal.up");
    const down = concludeStock(stock({ zScore: -3.1, idio: -0.07 }));
    expect(down.tone).toBe("signal");
    expect(down.headline.key).toBe("conclusion.signal.down");
    expect(down.headline.params).toMatchObject({ z: "3.1", specific: "-7.00%" });
  });

  it("separates worth watching from calm at the engine's moderate line", () => {
    expect(concludeStock(stock({ zScore: 1.5 })).tone).toBe("watch");
    expect(concludeStock(stock({ zScore: 0.4 })).tone).toBe("calm");
  });

  it("follows stricter admin bars", () => {
    const bars = { signalZ: 3, fitFloor: 0.5, minPeers: 4 };
    expect(concludeStock(stock({ zScore: 2.4 }), bars).tone).toBe("watch");
    expect(concludeStock(stock({ fitQuality: 0.45 }), bars).tone).toBe("refused");
  });

  it("states the news check and the next corporate action", () => {
    const c = concludeStock(
      stock({
        realityVerdict: "contradiction",
        upcoming: [
          { kind: "dividend", date: "2026-10-20" },
          { kind: "agm", date: "2026-11-02" },
        ],
      }),
    );
    expect(c.points.map((p) => p.key)).toEqual([
      "conclusion.point.happened",
      "conclusion.point.unusual",
      "conclusion.point.news.contradiction",
      "conclusion.point.watch",
    ]);
    expect(c.points[3].params).toMatchObject({ count: 2, date: "2026-10-20", action: { key: "conclusion.action.dividend" } });
  });

  it("treats an unknown news verdict as not enough evidence", () => {
    expect(concludeStock(stock({ realityVerdict: "something new" })).points[2].key).toBe(
      "conclusion.point.news.insufficient",
    );
    expect(concludeStock(stock()).points[3].key).toBe("conclusion.point.watchNone");
  });
});

const row = (symbol: string, over: Partial<BriefRow> = {}): BriefRow => ({
  symbol,
  companyName: symbol,
  sector: "Banks",
  zScore: 2.5,
  verdict: "significant",
  fitQuality: 0.6,
  constituentCount: 5,
  totalReturn: 0.05,
  marketReturn: 0.01,
  sectorReturn: 0.01,
  idioReturn: 0.03,
  realityVerdict: "confirmed",
  smartMoneyType: null,
  smartMoneyConviction: null,
  ...over,
});

const brief = (over: Partial<Brief> = {}): Brief => ({
  covered: 10,
  reliable: 8,
  signalCount: 2,
  movers: [row("BBRI")],
  disagreements: [],
  smartMoney: [],
  sectors: [],
  singleStockSectors: [],
  unreliable: [],
  ...over,
});

const run: RunFacts = {
  runDate: "2026-10-02",
  inProgress: false,
  done: 10,
  queued: 10,
  skipped: 0,
  failed: 0,
  creditsSpent: 42,
  creditCap: 60,
};

describe("concludeMarket", () => {
  it("leads with the signal count and the largest mover", () => {
    const c = concludeMarket(brief(), run);
    expect(c.tone).toBe("signal");
    expect(c.headline.key).toBe("conclusion.market.signals");
    expect(c.headline.params).toMatchObject({ count: 2, covered: 10, symbol: "BBRI" });
    expect(c.points.at(-1)?.key).toBe("conclusion.market.credits");
  });

  it("says quiet days are quiet", () => {
    const c = concludeMarket(brief({ signalCount: 0 }), run);
    expect(c.tone).toBe("calm");
    expect(c.headline.key).toBe("conclusion.market.quiet");
  });

  it("refuses an empty run and flags partial or ongoing runs first", () => {
    expect(concludeMarket(brief({ covered: 0, movers: [] }), run).tone).toBe("refused");
    const ongoing = concludeMarket(brief(), { ...run, inProgress: true, done: 3 });
    expect(ongoing.points[0].key).toBe("conclusion.market.inProgress");
    const partial = concludeMarket(brief(), { ...run, skipped: 2, failed: 1 });
    expect(partial.points[0]).toMatchObject({ key: "conclusion.market.partial", params: { skipped: 2, failed: 1 } });
  });

  it("names the sector, disagreements and the stocks left out", () => {
    const c = concludeMarket(
      brief({
        sectors: [{ sector: "Banks", count: 3, avgMarket: 0, avgSector: 0, avgIdio: 0.02, signalCount: 1 }],
        disagreements: [row("TLKM"), row("ASII")],
        unreliable: [row("GOTO")],
      }),
      run,
    );
    expect(c.points.map((p) => p.key)).toEqual([
      "conclusion.market.sector",
      "conclusion.market.disagreements",
      "conclusion.market.unreliable",
      "conclusion.market.credits",
    ]);
    expect(c.points[1].params).toMatchObject({ symbols: "TLKM, ASII" });
  });
});

describe("concludeCompare", () => {
  const r = (symbol: string, zScore: number, fitQuality = 0.6) => ({ symbol, zScore, idiosyncratic: 0.02, fitQuality });

  it("names the stock apart and the one closest to its twin", () => {
    const c = concludeCompare([r("BBRI", 2.6), r("BMRI", 0.3)]);
    expect(c?.tone).toBe("signal");
    expect(c?.headline.params).toMatchObject({ symbol: "BBRI" });
    expect(c?.points[0]).toMatchObject({ key: "conclusion.compare.bottom", params: { symbol: "BMRI" } });
  });

  it("leaves weak twins out of the call and refuses when none is usable", () => {
    const c = concludeCompare([r("GOTO", 4, 0.1), r("BBRI", 1.2)]);
    expect(c?.headline).toMatchObject({ key: "conclusion.compare.calm", params: { symbol: "BBRI" } });
    expect(c?.points.at(-1)).toMatchObject({ key: "conclusion.compare.weak", params: { symbols: "GOTO" } });
    expect(concludeCompare([r("GOTO", 4, 0.1)])?.tone).toBe("refused");
  });
});

describe("portfolio conclusion", () => {
  const facts = (symbol: string, over: Partial<WatchFacts> = {}, stats: Partial<WatchFacts["stats"]> = {}): WatchFacts => ({
    symbol,
    runDate: "2026-10-02",
    asOf: "2026-10-02",
    zScore: 0.5,
    fitQuality: 0.6,
    peers: 5,
    total: 0.01,
    market: 0.005,
    sector: 0.003,
    idio: 0.002,
    realityVerdict: "confirmed",
    smartMoneyType: null,
    smartMoneyConviction: null,
    prices: null,
    keyStats: null,
    stats: {
      pe: null, pb: null, eps: null, revenueGrowth: null, earningsGrowth: null, roe: null,
      netMargin: null, dividendYield: null, debtToEquity: null, rangePosition: null, low52: null, high52: null,
      ...stats,
    },
    ...over,
  });
  const base = { unreadAlerts: 0, actions: [], rulesTriggered: [], actionDays: 30 };

  it("refuses an empty watchlist", () => {
    const f = portfolioFacts({ ...base, symbols: [], stocks: [] });
    expect(concludePortfolio(f).headline.key).toBe("conclusion.portfolio.empty");
  });

  it("covers only stocks still on the watchlist", () => {
    const f = portfolioFacts({
      ...base,
      symbols: ["BBRI"],
      stocks: [
        { facts: facts("BBRI"), isSignal: true },
        { facts: facts("GOTO", {}, { earningsGrowth: -0.6 }), isSignal: true },
      ],
      actions: [
        { symbol: "BBRI", kind: "dividend", date: "2026-10-28", cashIdr: 120000 },
        { symbol: "GOTO", kind: "agm", date: "2026-10-10", cashIdr: null },
      ],
      rulesTriggered: ["GOTO", "BBRI", "BBRI"],
    });
    expect(f.signalling).toEqual(["BBRI"]);
    expect(f.financial).toEqual([]);
    expect(f.actions.map((a) => a.symbol)).toEqual(["BBRI"]);
    expect(f.rulesTriggered).toEqual(["BBRI"]);
    expect(f.upcomingIncome).toBe(120000);
    const text = JSON.stringify(concludePortfolio(f));
    expect(text).not.toContain("GOTO");
  });

  it("names corporate actions with rupiah, sharp financial results, range edges and volume", () => {
    const f = portfolioFacts({
      ...base,
      symbols: ["BBRI", "TLKM", "ASII", "UNVR"],
      stocks: [
        { facts: facts("BBRI", { prices: { asOf: "2026-10-02", lastClose: 4500, prevClose: 4400, change1d: 0.02, return5d: 0.03, volume: 9e7, avgVolume20: 3e7, volumeRatio: 3, dailyVolatility: 0.015 } }, { earningsGrowth: 0.31, revenueGrowth: 0.08, rangePosition: 0.95 }), isSignal: false },
        { facts: facts("TLKM", {}, { earningsGrowth: 0.05, revenueGrowth: 0.02, rangePosition: 0.04 }), isSignal: false },
        { facts: facts("ASII"), isSignal: false },
      ],
      actions: [{ symbol: "BBRI", kind: "dividend", date: "2026-10-28", cashIdr: 120000 }],
    });
    const c = concludePortfolio(f);
    expect(c.headline.key).toBe("conclusion.portfolio.quiet");
    const keys = c.points.map((p) => p.key);
    expect(keys).toEqual([
      "conclusion.portfolio.actionCash",
      "conclusion.portfolio.financial",
      "conclusion.portfolio.nearHigh",
      "conclusion.portfolio.nearLow",
      "conclusion.portfolio.volume",
      "conclusion.portfolio.notCovered",
    ]);
    expect(c.points[1].params).toMatchObject({ symbol: "BBRI", earnings: "+31.0%", revenue: "+8.0%" });
    expect(c.points[4].params).toMatchObject({ list: "BBRI 3.0x" });
    expect(c.points[5].params).toMatchObject({ symbols: "UNVR" });
  });

  it("says when results are steady and when no action is due, and caps long lists", () => {
    const steady = portfolioFacts({
      ...base,
      symbols: ["TLKM"],
      stocks: [{ facts: facts("TLKM", {}, { earningsGrowth: 0.05 }), isSignal: false }],
    });
    expect(concludePortfolio(steady).points.map((p) => p.key)).toEqual([
      "conclusion.portfolio.noActions",
      "conclusion.portfolio.financialSteady",
    ]);

    const many = portfolioFacts({
      ...base,
      symbols: ["AAAA"],
      stocks: [{ facts: facts("AAAA"), isSignal: true }],
      unreadAlerts: 2,
      rulesTriggered: ["AAAA"],
      actions: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"].map((date) => ({
        symbol: "AAAA",
        kind: "agm" as const,
        date,
        cashIdr: null,
      })),
    });
    const c = concludePortfolio(many);
    expect(c.tone).toBe("signal");
    expect(c.points.map((p) => p.key)).toEqual([
      "conclusion.portfolio.alerts",
      "conclusion.portfolio.rules",
      "conclusion.portfolio.action",
      "conclusion.portfolio.action",
      "conclusion.portfolio.action",
      "conclusion.more",
    ]);
    expect(c.points[5].params).toMatchObject({ count: 2 });
  });
});

describe("concludeTrackRecord", () => {
  const bucket = (count: number, share: number | null) => ({ count, continuedShare: share, avgSignedExcess: share });

  it("refuses a rate below the minimum sample", () => {
    const record: TrackRecord = { signals: bucket(4, null), ordinary: bucket(40, 0.5), enough: false, minSample: 10 };
    const c = concludeTrackRecord(record);
    expect(c.tone).toBe("refused");
    expect(c.headline.params).toMatchObject({ count: 4, min: 10 });
  });

  it("states the rate and compares it with ordinary days", () => {
    const record: TrackRecord = { signals: bucket(12, 0.583), ordinary: bucket(80, 0.5), enough: true, minSample: 10 };
    const c = concludeTrackRecord(record);
    expect(c.headline.params).toMatchObject({ count: 12, share: "58%" });
    expect(c.points[0].params).toMatchObject({ signal: "58%", ordinary: "50%" });
    expect(concludeTrackRecord({ ...record, ordinary: bucket(5, null) }).points).toEqual([]);
  });
});
