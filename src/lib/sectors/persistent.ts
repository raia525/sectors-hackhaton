import "server-only";
import { prisma } from "@/lib/db";
import type { SectorsCache } from "./cache";
import type { CreditLedger, LedgerSnapshot } from "./credits";

/**
 * Durable cache and credit ledger, backed by Postgres.
 *
 * The in-memory versions are correct but forget everything on restart. On a
 * serverless platform that means every cold start begins with an empty cache
 * and a fresh budget, so the real spend would be far higher than the ledger
 * believed. Persisting both is what makes the 1,000 credit budget enforceable
 * rather than aspirational.
 *
 * A small in-process layer sits in front of the database so a hot key does not
 * cost a query on every request.
 */

/**
 * Tracks whether the database has proved unreachable.
 *
 * A configured DATABASE_URL is not a guarantee the database answers: the
 * credentials may be wrong, or it may simply be down. Rather than failing every
 * page, the persistent layer degrades to its in-memory tier and warns once.
 * Warning on every request would bury the message in noise.
 */
let databaseUnavailable = false;
let warnedOnce = false;

function noteDatabaseFailure(error: unknown): void {
  databaseUnavailable = true;
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(
    "Database unreachable, falling back to in-memory cache and credit ledger. " +
      "The credit budget will reset when the server restarts. " +
      `Cause: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
  );
}

/** Test and diagnostics helper. */
export function isDatabaseAvailable(): boolean {
  return !databaseUnavailable;
}

export class PostgresCache implements SectorsCache {
  private readonly hot = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly hotSize = 200) {}

  async get<T>(key: string): Promise<T | null> {
    const local = this.hot.get(key);
    if (local && Date.now() < local.expiresAt) return local.value as T;
    if (local) this.hot.delete(key);

    if (databaseUnavailable) return null;

    try {
      const row = await prisma.apiCache.findUnique({ where: { key } });
      if (!row) return null;

      if (row.expiresAt.getTime() <= Date.now()) {
        // Expired rows are cleaned up lazily rather than by a scheduled sweep,
        // which keeps the deployment free of another moving part. deleteMany
        // rather than delete: concurrent requests racing to read the same
        // stale key can both reach this branch, and delete() throws (loudly,
        // even through .catch, since Prisma logs before rejecting) when the
        // row the other request already removed no longer exists.
        await prisma.apiCache.deleteMany({ where: { key } }).catch(() => {});
        return null;
      }

      this.remember(key, row.payload, row.expiresAt.getTime());
      return row.payload as T;
    } catch (error) {
      noteDatabaseFailure(error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // The in-memory tier is written first, so caching keeps working even when
    // the durable write fails.
    this.remember(key, value, expiresAt.getTime());
    if (databaseUnavailable) return;

    try {
      const payload = value as never;
      await prisma.apiCache.upsert({
        where: { key },
        create: { key, payload, expiresAt },
        update: { payload, expiresAt },
      });
    } catch (error) {
      noteDatabaseFailure(error);
    }
  }

  async delete(key: string): Promise<void> {
    this.hot.delete(key);
    if (databaseUnavailable) return;
    // deleteMany rather than delete: see the comment in get() on why delete()
    // is unsafe when the same key can be removed concurrently.
    await prisma.apiCache.deleteMany({ where: { key } }).catch(() => {});
  }

  private remember(key: string, value: unknown, expiresAt: number): void {
    if (this.hot.size >= this.hotSize && !this.hot.has(key)) {
      const oldest = this.hot.keys().next().value;
      if (oldest !== undefined) this.hot.delete(oldest);
    }
    this.hot.set(key, { value, expiresAt });
  }
}

/**
 * Credit ledger backed by an append-only usage table.
 *
 * Spending is summed from the table rather than held in a counter, so a deploy
 * or a second instance cannot reset or double-count the budget.
 */
export class PostgresCreditLedger implements CreditLedger {
  private cachedSpend: { value: number; at: number } | null = null;

  /** Short cache window: a few seconds of staleness is a rounding error
   * against a 1,000 credit budget, and it avoids a COUNT on every call. */
  private static readonly SPEND_TTL_MS = 5_000;

  constructor(
    private readonly limit: number,
    private readonly reserve: number,
  ) {
    if (reserve >= limit) {
      throw new Error("Credit reserve must be smaller than the total limit.");
    }
  }

  /**
   * Spending counted in this process while the database is unreachable.
   *
   * Losing the durable ledger must not mean losing the budget: an unmetered
   * client could spend the entire hackathon allowance in one bad loop. This
   * keeps the cap enforced in memory, accepting that it resets on restart.
   */
  private fallbackSpend = 0;

  async tryConsume(cost: number, label: string, priority = false): Promise<boolean> {
    if (cost <= 0) return true;

    const used = await this.spent();
    const ceiling = priority ? this.limit : this.limit - this.reserve;
    if (used + cost > ceiling) return false;

    if (databaseUnavailable) {
      this.fallbackSpend += cost;
      return true;
    }

    try {
      await prisma.creditUsage.create({ data: { endpoint: label, cost } });
      this.cachedSpend = { value: used + cost, at: Date.now() };
      return true;
    } catch (error) {
      noteDatabaseFailure(error);
      // Still count it: the call is about to be made either way.
      this.fallbackSpend += cost;
      return true;
    }
  }

  async refund(cost: number): Promise<void> {
    if (cost <= 0) return;

    if (databaseUnavailable) {
      this.fallbackSpend = Math.max(0, this.fallbackSpend - cost);
      return;
    }

    try {
      // Recorded as a negative entry so the ledger stays append-only and the
      // history of what was attempted is preserved.
      await prisma.creditUsage.create({ data: { endpoint: "refund", cost: -cost } });
      this.cachedSpend = null;
    } catch (error) {
      noteDatabaseFailure(error);
      this.fallbackSpend = Math.max(0, this.fallbackSpend - cost);
    }
  }

  async spent(): Promise<number> {
    if (databaseUnavailable) return this.fallbackSpend;

    const cached = this.cachedSpend;
    if (cached && Date.now() - cached.at < PostgresCreditLedger.SPEND_TTL_MS) {
      return cached.value;
    }

    try {
      const result = await prisma.creditUsage.aggregate({ _sum: { cost: true } });
      const value = result._sum.cost ?? 0;
      this.cachedSpend = { value, at: Date.now() };
      return value;
    } catch (error) {
      noteDatabaseFailure(error);
      return this.fallbackSpend;
    }
  }

  async remaining(): Promise<number> {
    return Math.max(0, this.limit - (await this.spent()));
  }

  async snapshot(): Promise<LedgerSnapshot> {
    const used = await this.spent();
    const base = {
      limit: this.limit,
      spent: used,
      remaining: Math.max(0, this.limit - used),
      reserve: this.reserve,
    };

    if (databaseUnavailable) return { ...base, byLabel: {} };

    try {
      const grouped = await prisma.creditUsage.groupBy({
        by: ["endpoint"],
        _sum: { cost: true },
      });
      return {
        ...base,
        byLabel: Object.fromEntries(
          grouped.map((g) => [g.endpoint, g._sum.cost ?? 0]),
        ),
      };
    } catch (error) {
      noteDatabaseFailure(error);
      return { ...base, byLabel: {} };
    }
  }
}
