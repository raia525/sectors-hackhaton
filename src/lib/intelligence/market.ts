import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSignalBars } from "@/lib/settings/server";
import { buildBrief, type Brief } from "./brief";
import { latestRun, toBriefRow } from "./pipeline";
import { summarizeTrackRecord, type TrackRecord } from "./track-record";
import type { RunFacts } from "./summary";

/**
 * What the Market pages show, read from stored snapshots once per request.
 * Nothing here calls the Sectors API, so opening any Market tab never
 * spends a credit.
 */

export interface MarketData {
  run: NonNullable<Awaited<ReturnType<typeof latestRun>>>;
  facts: RunFacts;
  brief: Brief;
  skipped: string[];
  failed: string[];
}

export const loadMarket = cache(async (): Promise<MarketData | null> => {
  const run = await latestRun();
  if (!run) return null;

  const [snapshots, bars] = await Promise.all([
    prisma.signalSnapshot.findMany({ where: { runDate: run.runDate } }),
    getSignalBars(),
  ]);
  const brief = buildBrief(snapshots.map(toBriefRow), 5, bars);
  const skipped = run.items.filter((i) => i.status === "SKIPPED").map((i) => i.symbol);
  const failed = run.items.filter((i) => i.status === "FAILED").map((i) => i.symbol);

  return {
    run,
    brief,
    skipped,
    failed,
    facts: {
      runDate: run.runDate,
      inProgress: run.status === "ANALYSING",
      done: run.items.filter((i) => i.status === "DONE").length,
      queued: run.items.length,
      skipped: skipped.length,
      failed: failed.length,
      creditsSpent: run.creditsSpent,
      creditCap: run.creditCap,
    },
  };
});

/** Every resolved snapshot, scored against the current signal bars. */
export const loadTrackRecord = cache(async (): Promise<TrackRecord> => {
  const [resolved, bars] = await Promise.all([
    prisma.signalSnapshot.findMany({
      where: { forwardStockReturn: { not: null }, forwardTwinReturn: { not: null } },
      select: {
        zScore: true,
        fitQuality: true,
        constituentCount: true,
        forwardStockReturn: true,
        forwardTwinReturn: true,
      },
    }),
    getSignalBars(),
  ]);
  return summarizeTrackRecord(
    resolved.map((r) => ({
      ...r,
      forwardStockReturn: r.forwardStockReturn ?? 0,
      forwardTwinReturn: r.forwardTwinReturn ?? 0,
    })),
    bars,
  );
});
