import "server-only";
import { prisma } from "@/lib/db";

/**
 * Copies each stock's sector from its latest stored analysis into the ticker
 * directory. The directory sync only gives code and name, and fetching every
 * company's profile for its sector would cost about 950 credits, so sectors
 * are learnt from analyses already paid for. Returns how many were set.
 */
export async function backfillSectors(): Promise<number> {
  const rows = await prisma.signalSnapshot.findMany({
    where: { sector: { not: null } },
    orderBy: { runDate: "desc" },
    distinct: ["symbol"],
    select: { symbol: true, sector: true },
  });
  let updated = 0;
  for (const row of rows) {
    if (!row.sector) continue;
    const result = await prisma.companyDirectoryEntry.updateMany({
      where: { symbol: row.symbol },
      data: { sector: row.sector },
    });
    updated += result.count;
  }
  return updated;
}
