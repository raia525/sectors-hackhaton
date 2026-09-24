import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Instant ticker and company name search, served entirely from the local
 * directory table. No Sectors API call and no credit spent per request: the
 * directory is synced separately (see src/lib/directory/sync.ts).
 */

export const dynamic = "force-dynamic";

/** Matches per request. Kept small: this feeds a dropdown, not a results page. */
const MAX_RESULTS = 8;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length === 0) {
    return NextResponse.json({ results: [], totalMatches: 0 });
  }

  const whereClause = {
    OR: [
      { symbol: { startsWith: query.toUpperCase() } },
      { companyName: { contains: query, mode: "insensitive" as const } },
    ],
  };

  // Matches on either the ticker or the company name, so typing "bank" finds
  // every bank and typing "BBCA" finds the ticker directly. The count is a
  // separate query against the true match set, not the length of the trimmed
  // page, so "N more" in the dropdown is never wrong.
  const [bySymbol, byName, totalMatches] = await Promise.all([
    prisma.companyDirectoryEntry.findMany({
      where: { symbol: { startsWith: query.toUpperCase() } },
      take: MAX_RESULTS,
      orderBy: { symbol: "asc" },
    }),
    prisma.companyDirectoryEntry.findMany({
      where: { companyName: { contains: query, mode: "insensitive" } },
      take: MAX_RESULTS,
      orderBy: { companyName: "asc" },
    }),
    prisma.companyDirectoryEntry.count({ where: whereClause }),
  ]);

  // Symbol matches rank first: a search for "BBCA" should not be pushed down
  // by every company whose name happens to contain those letters.
  const merged = new Map<string, { symbol: string; companyName: string }>();
  for (const row of [...bySymbol, ...byName]) {
    if (!merged.has(row.symbol)) {
      merged.set(row.symbol, { symbol: row.symbol, companyName: row.companyName });
    }
  }

  const results = [...merged.values()].slice(0, MAX_RESULTS);

  return NextResponse.json({
    results,
    totalMatches,
    truncated: totalMatches > results.length,
  });
}
