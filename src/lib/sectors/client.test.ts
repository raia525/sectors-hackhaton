import { describe, expect, it, vi } from "vitest";
import {
  clampWindow,
  CreditExhaustedError,
  SectorsApiError,
  SectorsClient,
} from "./client";
import { MemoryCache, NullCache } from "./cache";
import { MemoryCreditLedger, UnlimitedCreditLedger } from "./credits";
import { normalizeSymbol } from "./endpoints";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeClient(
  fetchImpl: typeof fetch,
  opts: { cache?: MemoryCache | NullCache; ledger?: MemoryCreditLedger } = {},
) {
  return new SectorsClient({
    apiKey: "test-key",
    cache: opts.cache ?? new NullCache(),
    ledger: opts.ledger ?? new UnlimitedCreditLedger(),
    fetchImpl,
  });
}

describe("normalizeSymbol", () => {
  it("accepts a bare ticker and strips the .JK suffix", () => {
    expect(normalizeSymbol("bbri")).toBe("BBRI");
    expect(normalizeSymbol("BBRI.JK")).toBe("BBRI");
    expect(normalizeSymbol("  bbca.jk  ")).toBe("BBCA");
  });

  it("rejects anything that cannot be an IDX ticker", () => {
    // Rejecting before the request is what keeps a typo from costing a credit.
    expect(normalizeSymbol("BB")).toBeNull();
    expect(normalizeSymbol("TOOLONG")).toBeNull();
    expect(normalizeSymbol("BB1I")).toBeNull();
    expect(normalizeSymbol("")).toBeNull();
  });
});

describe("clampWindow", () => {
  it("caps the window at the upstream 90-day maximum", () => {
    const { start, end } = clampWindow("2020-01-01", "2025-06-30");
    const days =
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
    expect(days).toBeLessThanOrEqual(89);
  });

  it("never returns a future end date", () => {
    const { end } = clampWindow(undefined, "2999-01-01");
    expect(Date.parse(`${end}T00:00:00Z`)).toBeLessThanOrEqual(Date.now());
  });

  it("preserves a window already inside the limit", () => {
    expect(clampWindow("2025-06-01", "2025-06-30")).toEqual({
      start: "2025-06-01",
      end: "2025-06-30",
    });
  });
});

describe("SectorsClient authentication and requests", () => {
  it("sends the API key in the Authorization header", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    await makeClient(fetchMock as unknown as typeof fetch).dailyTransaction("BBRI");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("test-key");
  });

  it("requests only the report sections asked for", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    await makeClient(fetchMock as unknown as typeof fetch).companyReport("BBRI", [
      "overview",
      "financials",
    ]);

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("sections=financials%2Coverview");
  });

  it("rejects an invalid ticker without making a request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await expect(client.dailyTransaction("NOPE1")).rejects.toThrow(/Invalid IDX ticker/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty section list without making a request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await expect(client.companyReport("BBRI", [])).rejects.toThrow(/At least one/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clamps the news limit to the supported range", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }));
    await makeClient(fetchMock as unknown as typeof fetch).news({ limit: 500 });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("limit=30");
  });

  it("accepts IHSG for foreign flow, which is not a four letter ticker", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ symbol: "IHSG", data: [] }));
    await makeClient(fetchMock as unknown as typeof fetch).foreignFlow("IHSG");

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/v2/foreign-flow/IHSG/");
  });

  it("still rejects an invalid ticker for foreign flow", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await expect(client.foreignFlow("NOPE1")).rejects.toThrow(/Invalid IDX ticker/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clamps the foreign flow window to the upstream maximum", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ symbol: "BBRI", data: [] }));
    await makeClient(fetchMock as unknown as typeof fetch).foreignFlow("BBRI", {
      start: "2020-01-01",
      end: "2025-06-30",
    });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("end=2025-06-30");
    expect(url).toContain("start=2025-04-02");
  });

  it("passes the requested year through to shareholders", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ symbol: "BBRI", data: [] }));
    await makeClient(fetchMock as unknown as typeof fetch).shareholders("BBRI", 2025);

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/v2/company/shareholders-composition/BBRI/");
    expect(url).toContain("year=2025");
  });

  it("omits the year when none is given", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ symbol: "BBRI", data: [] }));
    await makeClient(fetchMock as unknown as typeof fetch).shareholders("BBRI");

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).not.toContain("year=");
  });

  it("surfaces upstream errors with their status", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ detail: "nope" }, 429));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await expect(client.dailyTransaction("BBRI")).rejects.toBeInstanceOf(SectorsApiError);
  });

  it("requires an API key", () => {
    expect(
      () =>
        new SectorsClient({
          apiKey: "",
          cache: new NullCache(),
          ledger: new UnlimitedCreditLedger(),
        }),
    ).toThrow(/SECTORS_API_KEY/);
  });
});

describe("caching and de-duplication", () => {
  it("serves a repeat call from cache without spending a credit", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ date: "2025-06-02" }]));
    const cache = new MemoryCache();
    const ledger = new MemoryCreditLedger(1000, 0);
    const client = makeClient(fetchMock as unknown as typeof fetch, { cache, ledger });

    await client.dailyTransaction("BBRI", { start: "2025-06-01", end: "2025-06-10" });
    await client.dailyTransaction("BBRI", { start: "2025-06-01", end: "2025-06-10" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await ledger.spent()).toBe(1);
  });

  it("collapses concurrent identical requests into one call", async () => {
    // Eight peer cards rendering at once must not buy the same series eight times.
    const fetchMock = vi.fn(
      async () =>
        new Promise<Response>((resolve) =>
          setTimeout(() => resolve(jsonResponse([])), 10),
        ),
    );
    const client = makeClient(fetchMock as unknown as typeof fetch, {
      cache: new MemoryCache(),
    });

    await Promise.all([
      client.dailyTransaction("BBRI", { start: "2025-06-01", end: "2025-06-10" }),
      client.dailyTransaction("BBRI", { start: "2025-06-01", end: "2025-06-10" }),
      client.dailyTransaction("BBRI", { start: "2025-06-01", end: "2025-06-10" }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts least recently used entries at the bound", async () => {
    const cache = new MemoryCache(2);
    await cache.set("a", 1, 60);
    await cache.set("b", 2, 60);
    await cache.get("a"); // refresh "a" so "b" becomes the eviction target
    await cache.set("c", 3, 60);

    expect(await cache.get("a")).toBe(1);
    expect(await cache.get("b")).toBeNull();
    expect(cache.size).toBe(2);
  });

  it("expires entries after the ttl", async () => {
    vi.useFakeTimers();
    try {
      const cache = new MemoryCache();
      await cache.set("k", "v", 10);
      vi.advanceTimersByTime(11_000);
      expect(await cache.get("k")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("credit budget enforcement", () => {
  it("refuses a call that would breach the budget", async () => {
    const ledger = new MemoryCreditLedger(5, 0);
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = makeClient(fetchMock as unknown as typeof fetch, { ledger });

    // 8 sections costs 8 credits against a limit of 5.
    await expect(
      client.companyReport("BBRI", [
        "overview",
        "financials",
        "dividend",
        "future",
        "management",
        "ownership",
        "peers",
        "valuation",
      ]),
    ).rejects.toBeInstanceOf(CreditExhaustedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("holds back the reserve from non-priority callers", async () => {
    const ledger = new MemoryCreditLedger(100, 90);
    expect(await ledger.tryConsume(5, "background")).toBe(true);
    expect(await ledger.tryConsume(20, "background")).toBe(false);
    // The demo path may draw on the reserve.
    expect(await ledger.tryConsume(20, "demo", true)).toBe(true);
  });

  it("refunds credits when the upstream call fails", async () => {
    const ledger = new MemoryCreditLedger(1000, 0);
    const fetchMock = vi.fn(async () => jsonResponse({}, 500));
    const client = makeClient(fetchMock as unknown as typeof fetch, { ledger });

    await expect(client.dailyTransaction("BBRI")).rejects.toBeInstanceOf(SectorsApiError);
    expect(await ledger.spent()).toBe(0);
  });

  it("rejects a reserve larger than the limit", () => {
    expect(() => new MemoryCreditLedger(100, 100)).toThrow(/smaller than/);
  });

  it("tracks spending per endpoint for the budget dashboard", async () => {
    const ledger = new MemoryCreditLedger(1000, 0);
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = makeClient(fetchMock as unknown as typeof fetch, { ledger });

    await client.dailyTransaction("BBRI");
    await client.companyReport("BBCA", ["overview", "financials"]);

    const snap = ledger.snapshot();
    expect(snap.spent).toBe(3);
    expect(Object.keys(snap.byLabel).length).toBe(2);
  });
});
