import "server-only";
import { SectorsClient } from "./client";
import { MemoryCache, type SectorsCache } from "./cache";
import { MemoryCreditLedger, type CreditLedger } from "./credits";
import {
  isDatabaseAvailable,
  PostgresCache,
  PostgresCreditLedger,
} from "./persistent";
import { getEnv } from "@/lib/env";

/**
 * Process-wide Sectors client.
 *
 * The cache and ledger are shared across requests, otherwise each request would
 * start with an empty cache and a fresh budget, defeating both. In development
 * Next.js clears module state on hot reload, so the instance is parked on
 * globalThis to survive it.
 *
 * Storage is Postgres-backed when a database is reachable, falling back to
 * in-memory otherwise. The fallback keeps the app runnable for a reviewer who
 * has cloned the repo without provisioning a database, at the cost of a budget
 * that resets on restart. `usingPersistentStore` reports which is active so the
 * UI can say so rather than implying a durable budget it does not have.
 *
 * The `server-only` import turns an accidental client import into a build
 * error rather than a leaked API key.
 */

const globalForSectors = globalThis as unknown as {
  sectorsClient?: SectorsClient;
  sectorsLedger?: CreditLedger;
  sectorsCache?: SectorsCache;
  sectorsPersistent?: boolean;
};

/**
 * Whether to attempt the durable store.
 *
 * This only checks that a Postgres URL is configured. It deliberately does not
 * try to recognise placeholder credentials: that guesswork was wrong for
 * plausible-looking values, and the persistent layer already degrades to its
 * in-memory tier and warns once if the database does not answer. Detecting the
 * real condition beats predicting it.
 */
function hasDatabase(): boolean {
  return (process.env.DATABASE_URL ?? "").startsWith("postgres");
}

export function getSectorsClient(): SectorsClient {
  if (globalForSectors.sectorsClient) return globalForSectors.sectorsClient;

  const env = getEnv();
  const persistent = hasDatabase();

  const cache =
    globalForSectors.sectorsCache ??
    (persistent ? new PostgresCache() : new MemoryCache(1000));

  const ledger =
    globalForSectors.sectorsLedger ??
    (persistent
      ? new PostgresCreditLedger(env.SECTORS_CREDIT_LIMIT, env.SECTORS_CREDIT_RESERVE)
      : new MemoryCreditLedger(env.SECTORS_CREDIT_LIMIT, env.SECTORS_CREDIT_RESERVE));

  const client = new SectorsClient({ apiKey: env.SECTORS_API_KEY, cache, ledger });

  globalForSectors.sectorsCache = cache;
  globalForSectors.sectorsLedger = ledger;
  globalForSectors.sectorsPersistent = persistent;
  globalForSectors.sectorsClient = client;
  return client;
}

/**
 * Whether storage is actually durable right now.
 *
 * Both conditions matter: a durable store must have been selected, and the
 * database must not have since proved unreachable. Reporting only the first
 * would tell the UI the credit budget survives restarts when it does not.
 */
export function usingPersistentStore(): boolean {
  if (globalForSectors.sectorsPersistent === undefined) getSectorsClient();
  return (globalForSectors.sectorsPersistent ?? false) && isDatabaseAvailable();
}

/** Ledger snapshot for the budget indicator in the UI. */
export async function getCreditSnapshot() {
  getSectorsClient();
  const ledger = globalForSectors.sectorsLedger;

  if (ledger instanceof PostgresCreditLedger) return ledger.snapshot();
  if (ledger instanceof MemoryCreditLedger) return ledger.snapshot();

  const env = getEnv();
  return {
    limit: env.SECTORS_CREDIT_LIMIT,
    spent: 0,
    remaining: env.SECTORS_CREDIT_LIMIT,
    reserve: env.SECTORS_CREDIT_RESERVE,
    byLabel: {},
  };
}
