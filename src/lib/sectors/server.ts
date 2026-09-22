import "server-only";
import { SectorsClient } from "./client";
import { MemoryCache } from "./cache";
import { MemoryCreditLedger } from "./credits";
import { getEnv } from "@/lib/env";

/**
 * Process-wide Sectors client.
 *
 * The cache and ledger must be shared across requests, otherwise every request
 * would start with an empty cache and a fresh budget, which defeats both. In
 * development Next.js clears module state on hot reload, so the instance is
 * parked on globalThis to survive it.
 *
 * The `server-only` import makes an accidental client-side import a build
 * error rather than a leaked API key.
 */

const globalForSectors = globalThis as unknown as {
  sectorsClient?: SectorsClient;
  sectorsLedger?: MemoryCreditLedger;
  sectorsCache?: MemoryCache;
};

export function getSectorsClient(): SectorsClient {
  if (globalForSectors.sectorsClient) return globalForSectors.sectorsClient;

  const env = getEnv();
  const cache = globalForSectors.sectorsCache ?? new MemoryCache(1000);
  const ledger =
    globalForSectors.sectorsLedger ??
    new MemoryCreditLedger(env.SECTORS_CREDIT_LIMIT, env.SECTORS_CREDIT_RESERVE);

  const client = new SectorsClient({ apiKey: env.SECTORS_API_KEY, cache, ledger });

  globalForSectors.sectorsCache = cache;
  globalForSectors.sectorsLedger = ledger;
  globalForSectors.sectorsClient = client;
  return client;
}

/** Ledger snapshot for the budget indicator in the UI. */
export function getCreditSnapshot() {
  const env = getEnv();
  const ledger =
    globalForSectors.sectorsLedger ??
    new MemoryCreditLedger(env.SECTORS_CREDIT_LIMIT, env.SECTORS_CREDIT_RESERVE);
  globalForSectors.sectorsLedger = ledger;
  return ledger.snapshot();
}
