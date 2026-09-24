import { describe, expect, it } from "vitest";
import {
  buildDigest,
  COOLDOWN_HOURS,
  evaluateCorporateActionAlerts,
  evaluateDivergenceAlert,
  MATERIAL_Z_CHANGE,
  type WatchState,
} from "./rules";
import type { ShadowAnalysis } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import type { CorporateActionItem } from "@/lib/analysis/corporate-actions";
import { msg } from "@/lib/i18n/message";

const NOW = new Date("2025-06-15T09:00:00Z");

function state(over: Partial<WatchState> = {}): WatchState {
  return {
    symbol: "BBRI",
    zScoreThreshold: 2,
    notifyOnCorporateAction: true,
    notifyOnSmartMoney: true,
    lastNotifiedAt: null,
    lastNotifiedZ: null,
    ...over,
  };
}

function shadow(over: Partial<ShadowAnalysis> = {}): ShadowAnalysis {
  return {
    symbol: "BBRI",
    companyName: "Bank Rakyat Indonesia Tbk",
    asOf: "2025-06-14",
    fitWindow: 80,
    constituents: new Array(5).fill(null).map((_, i) => ({
      symbol: `PEER${i}`,
      companyName: `Peer ${i}`,
      weight: 0.2,
      similarity: 0.8,
      correlation: 0.7,
      components: {
        sector: 1, marketCap: 1, volatility: 1,
        correlation: 0.7, growth: 1, dividend: 1,
      },
    })),
    series: [],
    latestDivergence: 0.03,
    zScore: 2.6,
    verdict: "significant",
    attribution: { total: 0.06, market: 0.01, sector: 0.01, idiosyncratic: 0.04 },
    fitQuality: 0.62,
    warnings: [],
    ...over,
  };
}

function reality(over: Partial<RealityCheck> = {}): RealityCheck {
  return {
    verdict: "price_ahead_of_narrative",
    confidence: "moderate",
    narrative: { tone: "quiet", articleCount: 1, positiveShare: 0.5, dominantDimensions: [] },
    price: { idiosyncratic: 0.04, zScore: 2.6, fitQuality: 0.62 },
    findings: [],
    caveats: [],
    ...over,
  };
}

describe("evaluateDivergenceAlert", () => {
  it("fires when divergence clears the user's threshold", () => {
    const alert = evaluateDivergenceAlert(state(), shadow(), reality(), NOW);
    expect(alert).not.toBeNull();
    expect(alert!.kind).toBe("DIVERGENCE");
    expect(alert!.title.key).toBe("alert.divergenceTitle");
    expect(alert!.title.params?.direction).toEqual(msg("alert.direction.above"));
  });

  it("stays silent below the threshold", () => {
    expect(
      evaluateDivergenceAlert(state({ zScoreThreshold: 3 }), shadow(), reality(), NOW),
    ).toBeNull();
  });

  it("refuses to alert on a twin that explains almost nothing", () => {
    // Alerting on a meaningless divergence would contradict the product's
    // own standard for what counts as a finding.
    expect(
      evaluateDivergenceAlert(state(), shadow({ fitQuality: 0.2 }), reality(), NOW),
    ).toBeNull();
  });

  it("refuses to alert on a twin built from too few peers", () => {
    expect(
      evaluateDivergenceAlert(
        state(),
        shadow({ constituents: shadow().constituents.slice(0, 2) }),
        reality(),
        NOW,
      ),
    ).toBeNull();
  });

  it("respects the cooldown after a recent alert", () => {
    const recent = new Date(NOW.getTime() - (COOLDOWN_HOURS - 2) * 3600_000);
    expect(
      evaluateDivergenceAlert(
        state({ lastNotifiedAt: recent, lastNotifiedZ: 2.5 }),
        shadow(),
        reality(),
        NOW,
      ),
    ).toBeNull();
  });

  it("stays silent past the cooldown when nothing has materially changed", () => {
    // A stock parked above its threshold must not alert every single run.
    const old = new Date(NOW.getTime() - (COOLDOWN_HOURS + 10) * 3600_000);
    expect(
      evaluateDivergenceAlert(
        state({ lastNotifiedAt: old, lastNotifiedZ: 2.5 }),
        shadow({ zScore: 2.6 }),
        reality(),
        NOW,
      ),
    ).toBeNull();
  });

  it("fires again once the situation has moved materially", () => {
    const old = new Date(NOW.getTime() - (COOLDOWN_HOURS + 10) * 3600_000);
    const alert = evaluateDivergenceAlert(
      state({ lastNotifiedAt: old, lastNotifiedZ: 2.5 }),
      shadow({ zScore: 2.5 + MATERIAL_Z_CHANGE + 0.1 }),
      reality(),
      NOW,
    );
    expect(alert).not.toBeNull();
  });

  it("fires on a negative divergence too", () => {
    const alert = evaluateDivergenceAlert(
      state(),
      shadow({
        zScore: -2.8,
        attribution: { total: -0.05, market: 0.01, sector: 0, idiosyncratic: -0.06 },
      }),
      reality(),
      NOW,
    );
    expect(alert!.title.params?.direction).toEqual(msg("alert.direction.below"));
  });

  it("tells the reader whether news explains the move", () => {
    const unexplained = evaluateDivergenceAlert(state(), shadow(), reality(), NOW);
    expect(unexplained!.body.map((m) => m.key)).toContain("alert.reality.priceAhead");

    const contradicted = evaluateDivergenceAlert(
      state(),
      shadow(),
      reality({ verdict: "contradiction" }),
      NOW,
    );
    expect(contradicted!.body.map((m) => m.key)).toContain("alert.reality.contradiction");
  });

  it("always includes the fit so the alert carries its own reliability", () => {
    const alert = evaluateDivergenceAlert(state(), shadow(), reality(), NOW);
    const fitMessage = alert!.body.find((m) => m.key === "alert.fitAndConfidence");
    expect(fitMessage?.params?.fitPct).toBe("62");
  });
});

describe("evaluateCorporateActionAlerts", () => {
  const action = (over: Partial<CorporateActionItem> = {}): CorporateActionItem => ({
    kind: "dividend",
    timing: "upcoming",
    date: "2025-06-20",
    summary: msg("actions.dividendSummary", { amount: "Rp 135" }),
    effect: { cashIdr: 135_000, sharesAfter: null, adjustedAvgPrice: null },
    detail: null,
    ...over,
  });

  it("flags an action inside the horizon", () => {
    const alerts = evaluateCorporateActionAlerts(state(), [action()], NOW);
    expect(alerts).toHaveLength(1);
    const cashMessage = alerts[0].body.find((m) => m.key === "alert.actionDueCash");
    expect(cashMessage?.params?.amount).toBe("Rp 135.000");
  });

  it("ignores actions beyond the horizon", () => {
    const alerts = evaluateCorporateActionAlerts(
      state(),
      [action({ date: "2025-09-01" })],
      NOW,
    );
    expect(alerts).toHaveLength(0);
  });

  it("ignores past actions", () => {
    const alerts = evaluateCorporateActionAlerts(
      state(),
      [action({ timing: "recent", date: "2025-01-01" })],
      NOW,
    );
    expect(alerts).toHaveLength(0);
  });

  it("stays silent when the user turned these off", () => {
    expect(
      evaluateCorporateActionAlerts(
        state({ notifyOnCorporateAction: false }),
        [action()],
        NOW,
      ),
    ).toHaveLength(0);
  });

  it("states that a split leaves total value unchanged", () => {
    const alerts = evaluateCorporateActionAlerts(
      state(),
      [
        action({
          kind: "stock_split",
          summary: msg("actions.splitSummary", { ratio: 5 }),
          effect: { cashIdr: null, sharesAfter: 5000, adjustedAvgPrice: 1000 },
        }),
      ],
      NOW,
    );
    expect(alerts[0].body.map((m) => m.key)).toContain("alert.actionBecomesShares");
  });
});

describe("buildDigest", () => {
  const alerts = new Array(8).fill(null).map((_, i) => ({
    kind: "DIVERGENCE" as const,
    symbol: `SYM${i}`,
    title: msg("alert.reality.confirmed"),
    body: [msg("alert.reality.confirmed")],
    priority: i,
    payload: {},
  }));

  it("orders by priority and caps the length", () => {
    const digest = buildDigest(alerts, 5);
    expect(digest.alerts).toHaveLength(5);
    expect(digest.alerts[0].priority).toBe(7);
    expect(digest.omitted).toBe(3);
  });

  it("reports nothing omitted when everything fits", () => {
    const digest = buildDigest(alerts.slice(0, 3), 5);
    expect(digest.omitted).toBe(0);
  });
});
