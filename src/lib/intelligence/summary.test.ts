import { describe, expect, it } from "vitest";
import {
  concludeCompare,
  concludeMarket,
  concludePortfolio,
  concludeStock,
  concludeTrackRecord,
  type RunFacts,
  type StockFacts,
} from "./summary";
import type { Brief, BriefRow } from "./brief";
import type { TrackRecord } from "./track-record";

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

describe("concludePortfolio", () => {
  const facts = { watched: 4, signalling: [], notCovered: 0, unreadAlerts: 0, upcomingActions: 0, upcomingIncome: 0 };

  it("asks for a first stock when the watchlist is empty", () => {
    expect(concludePortfolio({ ...facts, watched: 0 }).headline.key).toBe("conclusion.portfolio.empty");
  });

  it("lists signalling stocks and what needs attention", () => {
    const c = concludePortfolio({
      ...facts,
      signalling: ["BBRI", "TLKM"],
      unreadAlerts: 3,
      upcomingActions: 2,
      upcomingIncome: 1_250_000,
      notCovered: 1,
    });
    expect(c.tone).toBe("signal");
    expect(c.headline.params).toMatchObject({ count: 2, symbols: "BBRI, TLKM" });
    expect(c.points.map((p) => p.key)).toEqual([
      "conclusion.portfolio.alerts",
      "conclusion.portfolio.income",
      "conclusion.portfolio.notCovered",
    ]);
  });

  it("is calm with nothing signalling, and counts actions without income", () => {
    const c = concludePortfolio({ ...facts, upcomingActions: 1 });
    expect(c.headline.key).toBe("conclusion.portfolio.quiet");
    expect(c.points[0].key).toBe("conclusion.portfolio.actions");
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
