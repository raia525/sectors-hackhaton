import { SECTORS_BASE_URL, endpoints, normalizeSymbol } from "./endpoints";
import type { CompanyReportSection } from "./endpoints";
import type { CreditLedger } from "./credits";
import type { SectorsCache } from "./cache";

/**
 * Typed client for the Sectors REST API.
 *
 * Two constraints drive this design:
 *
 * 1. The API key must never reach the browser, so this module is server-only.
 *    It is imported exclusively from route handlers and server components.
 * 2. The hackathon budget is 1,000 credits total and a single shadow analysis
 *    touches one report plus one daily series per peer. Every call therefore
 *    goes through a cache first and a credit ledger second, and the ledger can
 *    refuse a call rather than overspend.
 */

export class SectorsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "SectorsApiError";
  }
}

export class CreditExhaustedError extends Error {
  constructor(readonly remaining: number) {
    super(
      `Sectors API credit budget exhausted (${remaining} remaining). Refusing the call to stay within budget.`,
    );
    this.name = "CreditExhaustedError";
  }
}

export interface SectorsClientOptions {
  apiKey: string;
  cache: SectorsCache;
  ledger: CreditLedger;
  baseUrl?: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  /** Cache TTL in seconds. */
  ttl: number;
  cost: number;
  query?: Record<string, string | number | undefined>;
  /** Skips the cache read, used by the scheduled refresh job. */
  forceRefresh?: boolean;
}

/** TTLs chosen so intraday views stay fresh while reference data is not re-bought. */
export const TTL = {
  /** Prices move all session; short enough to feel live, long enough to batch. */
  dailyTransaction: 15 * 60,
  /** Fundamentals change quarterly. */
  companyReport: 24 * 60 * 60,
  /** Corporate actions are announced, then fixed. */
  corporateActions: 12 * 60 * 60,
  news: 30 * 60,
  index: 15 * 60,
  screener: 24 * 60 * 60,
} as const;

export class SectorsClient {
  private readonly apiKey: string;
  private readonly cache: SectorsCache;
  private readonly ledger: CreditLedger;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  /**
   * De-duplicates concurrent identical requests. Without this, a dashboard
   * rendering eight peer cards at once would buy the same series eight times.
   */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(options: SectorsClientOptions) {
    if (!options.apiKey) {
      throw new Error("SECTORS_API_KEY is required to construct SectorsClient.");
    }
    this.apiKey = options.apiKey;
    this.cache = options.cache;
    this.ledger = options.ledger;
    this.baseUrl = options.baseUrl ?? SECTORS_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Core request path: cache, then in-flight de-duplication, then the ledger,
   * and only then the network.
   */
  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    const cacheKey = url.toString();

    if (!options.forceRefresh) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) return cached;
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) return existing as Promise<T>;

    const promise = this.execute<T>(cacheKey, url, options).finally(() => {
      this.inFlight.delete(cacheKey);
    });
    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  private async execute<T>(
    cacheKey: string,
    url: URL,
    options: RequestOptions,
  ): Promise<T> {
    if (!(await this.ledger.tryConsume(options.cost, url.pathname))) {
      throw new CreditExhaustedError(await this.ledger.remaining());
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url.toString(), {
        headers: { Authorization: this.apiKey, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        // A failed call is not billed upstream, so return the credits.
        await this.ledger.refund(options.cost);
        const body = await response.text().catch(() => "");
        throw new SectorsApiError(
          `Sectors API returned ${response.status}: ${body.slice(0, 200)}`,
          response.status,
          url.pathname,
        );
      }

      const data = (await response.json()) as T;
      await this.cache.set(cacheKey, data, options.ttl);
      return data;
    } catch (error) {
      if (error instanceof SectorsApiError) throw error;
      await this.ledger.refund(options.cost);
      if (error instanceof Error && error.name === "AbortError") {
        throw new SectorsApiError(
          `Sectors API request timed out after ${this.timeoutMs}ms.`,
          504,
          url.pathname,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Company report. Requesting only the sections actually needed matters: the
   * default is all eight sections and costs 8 credits.
   */
  async companyReport<T = unknown>(
    symbol: string,
    sections: CompanyReportSection[],
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    const ticker = this.requireSymbol(symbol);
    const unique = [...new Set(sections)].sort();
    if (unique.length === 0) {
      throw new Error("At least one company report section must be requested.");
    }
    return this.request<T>(endpoints.companyReport(ticker), {
      ttl: TTL.companyReport,
      cost: unique.length,
      query: { sections: unique.join(",") },
      forceRefresh: opts.forceRefresh,
    });
  }

  async corporateActions<T = unknown>(
    symbol: string,
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    const ticker = this.requireSymbol(symbol);
    return this.request<T>(endpoints.corporateActions(ticker), {
      ttl: TTL.corporateActions,
      cost: 1,
      forceRefresh: opts.forceRefresh,
    });
  }

  /**
   * Daily OHLCV. The upstream window is capped at 90 days; asking for more is
   * silently clamped, so we clamp explicitly and let the caller know the real
   * range it received.
   */
  async dailyTransaction<T = unknown>(
    symbol: string,
    range: { start?: string; end?: string } = {},
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    const ticker = this.requireSymbol(symbol);
    const { start, end } = clampWindow(range.start, range.end);
    return this.request<T>(endpoints.dailyTransaction(ticker), {
      ttl: TTL.dailyTransaction,
      cost: 1,
      query: { start, end },
      forceRefresh: opts.forceRefresh,
    });
  }

  async news<T = unknown>(
    params: {
      symbols?: string[];
      subSector?: string;
      keyword?: string;
      start?: string;
      end?: string;
      limit?: number;
    } = {},
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    return this.request<T>(endpoints.news(), {
      ttl: TTL.news,
      cost: 1,
      query: {
        symbols: params.symbols?.join(","),
        sub_sector: params.subSector,
        keyword: params.keyword,
        start: params.start,
        end: params.end,
        // Upstream accepts 1-30; clamp so a bad caller cannot trigger a 400.
        limit: params.limit ? Math.min(Math.max(params.limit, 1), 30) : undefined,
      },
      forceRefresh: opts.forceRefresh,
    });
  }

  /**
   * Net daily foreign flow. Accepts IHSG as well as a company ticker, so the
   * symbol guard is relaxed for that one case.
   */
  async foreignFlow<T = unknown>(
    symbol: string,
    range: { start?: string; end?: string } = {},
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    const upper = symbol.trim().toUpperCase().replace(/\.JK$/, "");
    const ticker = upper === "IHSG" ? upper : this.requireSymbol(symbol);
    const { start, end } = clampWindow(range.start, range.end);

    return this.request<T>(endpoints.foreignFlow(ticker), {
      ttl: TTL.dailyTransaction,
      cost: 1,
      query: { start, end },
      forceRefresh: opts.forceRefresh,
    });
  }

  /**
   * Monthly shareholder composition by investor category.
   *
   * Data begins in 2021, so a year before that returns nothing and is not
   * worth a credit; the caller is expected to pass a recent year.
   */
  async shareholders<T = unknown>(
    symbol: string,
    year?: number,
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    const ticker = this.requireSymbol(symbol);

    return this.request<T>(endpoints.shareholders(ticker), {
      // Monthly snapshots, so a long TTL is safe and saves repeat spending.
      ttl: TTL.corporateActions,
      cost: 1,
      query: { year },
      forceRefresh: opts.forceRefresh,
    });
  }

  async indexDaily<T = unknown>(
    index: string,
    range: { start?: string; end?: string } = {},
    opts: { forceRefresh?: boolean } = {},
  ): Promise<T> {
    const { start, end } = clampWindow(range.start, range.end);
    return this.request<T>(endpoints.indexDaily(index.toLowerCase()), {
      ttl: TTL.index,
      cost: 1,
      query: { start, end },
      forceRefresh: opts.forceRefresh,
    });
  }

  private requireSymbol(symbol: string): string {
    const ticker = normalizeSymbol(symbol);
    if (!ticker) {
      throw new Error(
        `Invalid IDX ticker: ${symbol}. Expected four letters, for example BBRI.`,
      );
    }
    return ticker;
  }
}

/**
 * Clamps a date window to the upstream 90-day maximum and rejects future end
 * dates, which the API answers with a 400.
 */
export function clampWindow(
  start?: string,
  end?: string,
): { start: string; end: string } {
  const today = new Date();
  const endDate = end ? new Date(`${end}T00:00:00Z`) : today;
  const safeEnd = endDate > today ? today : endDate;

  const defaultStart = new Date(safeEnd);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 89);
  const startDate = start ? new Date(`${start}T00:00:00Z`) : defaultStart;

  const earliest = new Date(safeEnd);
  earliest.setUTCDate(earliest.getUTCDate() - 89);
  const safeStart = startDate < earliest ? earliest : startDate;

  return { start: toIsoDate(safeStart), end: toIsoDate(safeEnd) };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
