/**
 * Cache abstraction for Sectors API responses.
 *
 * The interface is deliberately minimal so the backing store can change
 * without touching the client. In development an in-process LRU is enough; in
 * production the Postgres-backed store survives restarts and is shared across
 * serverless instances, which is what actually protects the credit budget.
 */

export interface SectorsCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * Bounded in-memory cache with LRU eviction.
 *
 * The bound matters: an unbounded Map keyed by URL is a slow memory leak in a
 * long-running server, since every distinct date range creates a new key.
 */
export class MemoryCache implements SectorsCache {
  private readonly store = new Map<string, Entry>();

  constructor(private readonly maxEntries = 500) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Re-insert to mark as most recently used.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      // Map preserves insertion order, so the first key is the least recently
      // used after the re-insertion in get().
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Test and diagnostics helper. */
  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

/** Cache that never stores anything, for tests that must hit the fetch layer. */
export class NullCache implements SectorsCache {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {}
  async delete(): Promise<void> {}
}
