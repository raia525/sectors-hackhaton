import { describe, expect, it } from "vitest";
import { runRealityCheck } from "./reality-check";
import type { NewsItem } from "@/lib/sectors/schemas";
import type { ShadowAnalysis } from "@/lib/shadow/types";

function shadow(over: Partial<ShadowAnalysis> = {}): ShadowAnalysis {
  return {
    symbol: "BBRI",
    companyName: "Bank Rakyat Indonesia Tbk",
    asOf: "2025-06-30",
    fitWindow: 80,
    constituents: new Array(5).fill(null).map((_, i) => ({
      symbol: `PEER${i}`,
      companyName: `Peer ${i}`,
      weight: 0.2,
      similarity: 0.8,
      correlation: 0.75,
      components: {
        sector: 1,
        marketCap: 0.9,
        volatility: 0.8,
        correlation: 0.75,
        growth: 0.7,
        dividend: 0.6,
      },
    })),
    series: [],
    latestDivergence: 0.01,
    zScore: 0,
    verdict: "aligned",
    attribution: { total: 0.05, market: 0.02, sector: 0.02, idiosyncratic: 0.01 },
    fitQuality: 0.65,
    warnings: [],
    ...over,
  };
}

function news(count: number, cue: string): NewsItem[] {
  return new Array(count).fill(null).map((_, i) => ({
    title: `${cue} laporan ${i}`,
    body: null,
    source: "https://example.com",
    timestamp: "2025-06-30T00:00:00Z",
    sub_sector: ["banks"],
    tags: [],
    symbols: ["BBRI"],
    dimension: { financials: 1, valuation: 0.5 },
  }));
}

describe("runRealityCheck", () => {
  it("confirms when upbeat coverage matches a positive stock-specific move", () => {
    const result = runRealityCheck(
      shadow({ zScore: 2.4, attribution: { total: 0.08, market: 0.02, sector: 0.02, idiosyncratic: 0.04 } }),
      news(10, "laba melonjak"),
    );
    expect(result.verdict).toBe("confirmed");
    expect(result.narrative.tone).toBe("positive");
  });

  it("flags a contradiction when the story and the tape disagree", () => {
    // The case the product exists for: good news, but the stock is
    // underperforming its own twin.
    const result = runRealityCheck(
      shadow({
        zScore: -2.6,
        attribution: { total: -0.03, market: 0.01, sector: 0.01, idiosyncratic: -0.05 },
      }),
      news(10, "laba melonjak rekor"),
    );
    expect(result.verdict).toBe("contradiction");
  });

  it("reports narrative running ahead of price when the tape is quiet", () => {
    const result = runRealityCheck(
      shadow({ zScore: 0.3 }),
      news(10, "laba tumbuh positif"),
    );
    expect(result.verdict).toBe("narrative_ahead_of_price");
  });

  it("reports price moving before the story when coverage is thin", () => {
    const result = runRealityCheck(shadow({ zScore: 2.9 }), []);
    expect(result.verdict).toBe("price_ahead_of_narrative");
  });

  it("returns insufficient evidence rather than inventing a signal", () => {
    // No news and no unusual price action must not produce a confident verdict.
    const result = runRealityCheck(shadow({ zScore: 0.2 }), []);
    expect(result.verdict).toBe("insufficient_evidence");
    expect(result.confidence).toBe("low");
  });

  it("reads Indonesian negative cues", () => {
    const result = runRealityCheck(
      shadow({
        zScore: -2.5,
        attribution: { total: -0.06, market: 0, sector: -0.01, idiosyncratic: -0.05 },
      }),
      news(8, "rugi anjlok"),
    );
    expect(result.narrative.tone).toBe("negative");
    expect(result.verdict).toBe("confirmed");
  });

  it("never omits the caveats that keep the verdict honest", () => {
    const result = runRealityCheck(shadow(), news(5, "laba"));
    expect(result.caveats.join(" ")).toMatch(/not a forecast/i);
    expect(result.caveats.join(" ")).toMatch(/keyword lexicon/i);
  });

  it("downgrades confidence when the twin fits poorly", () => {
    const weak = runRealityCheck(
      shadow({ fitQuality: 0.15, zScore: 2.5 }),
      news(12, "laba melonjak"),
    );
    expect(weak.confidence).toBe("low");
    expect(weak.caveats.join(" ")).toMatch(/explains 15%/);
  });

  it("requires a well-fitted twin and broad coverage for high confidence", () => {
    const strong = runRealityCheck(
      shadow({ fitQuality: 0.7, zScore: 2.5 }),
      news(12, "laba melonjak"),
    );
    expect(strong.confidence).toBe("high");
  });

  it("propagates shadow warnings into the caveats", () => {
    const result = runRealityCheck(
      shadow({ warnings: ["Twin built from only 2 peers."] }),
      news(5, "laba"),
    );
    expect(result.caveats.join(" ")).toMatch(/only 2 peers/);
  });

  it("always reports the attribution breakdown", () => {
    const result = runRealityCheck(shadow(), news(4, "laba"));
    expect(result.findings[0]).toMatch(/traces to the market/);
  });
});
