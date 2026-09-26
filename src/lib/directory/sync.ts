import "server-only";
import { prisma } from "@/lib/db";
import { getSectorsClient } from "@/lib/sectors/server";
import { parseScreenerPage } from "@/lib/sectors/schemas";

/**
 * Populates the local IDX ticker directory from the screener endpoint.
 *
 * Run once at setup and periodically thereafter (weekly is more than enough:
 * new listings and delistings are rare events, not a daily occurrence). This
 * is what lets the search dropdown match symbol and company name instantly on
 * the client, with no credit spent and no network round trip per keystroke.
 *
 * Pages at the API's maximum of 200 to minimise both credits and calls: the
 * full ~960 company directory costs about 5 credits total, once.
 */

const PAGE_SIZE = 200;
/** Hard stop so a runaway pagination bug cannot loop indefinitely. */
const MAX_PAGES = 20;

export interface SyncResult {
  entriesWritten: number;
  pagesFetched: number;
  creditsSpent: number;
}

export async function syncCompanyDirectory(): Promise<SyncResult> {
  const client = getSectorsClient();
  let offset = 0;
  let page = 0;
  let entriesWritten = 0;

  while (page < MAX_PAGES) {
    const raw = await client.screener({
      limit: PAGE_SIZE,
      offset,
      orderBy: "symbol",
    });
    const { entries, hasNext } = parseScreenerPage(raw);
    page += 1;

    if (entries.length === 0) break;

    // One statement per page, not one upsert per row. Row by row was ~200
    // round trips a page, and with the function and the database in
    // different regions that alone ran past the hosting time limit.
    const symbols = entries.map((e) => e.symbol);
    const names = entries.map((e) => e.companyName);
    await prisma.$executeRaw`
      INSERT INTO "company_directory" ("symbol", "companyName", "updatedAt")
      SELECT s, n, NOW() FROM UNNEST(${symbols}::text[], ${names}::text[]) AS t(s, n)
      ON CONFLICT ("symbol") DO UPDATE
        SET "companyName" = EXCLUDED."companyName", "updatedAt" = EXCLUDED."updatedAt"
    `;
    entriesWritten += entries.length;

    if (!hasNext) break;
    offset += PAGE_SIZE;
  }

  return { entriesWritten, pagesFetched: page, creditsSpent: page };
}

/** True when the directory has never been populated. */
export async function isDirectoryEmpty(): Promise<boolean> {
  const count = await prisma.companyDirectoryEntry.count();
  return count === 0;
}
