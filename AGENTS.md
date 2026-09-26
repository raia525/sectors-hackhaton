# SHADOW IDX, working notes

Context for anyone, human or agent, changing this codebase.

## What this is

A market intelligence tool for IDX that builds a synthetic twin ("shadow") of a
stock from similar companies, then attributes the stock's return into market,
sector, and stock-specific components. Built for Sectors Hackathon 2026,
Track 3 (Market Intelligence).

## Non-negotiables

These exist because the product's value depends on them.

1. **Never present a weak signal as a strong one.** If the twin fits poorly, or
   history is thin, or no peer qualifies, the correct output is an explicit
   refusal with a reason. `warnings` and `caveats` arrays are load-bearing, not
   decoration, and the UI must render them next to the numbers they qualify.

2. **Never claim more than the data supports.** The smart money module measures
   institutional and foreign flow. It is not insider data; the Sectors API
   publishes no director-level dealings. There is a test asserting the word
   "insider" does not appear in its findings.

3. **Credits are a hard budget.** 1,000 for the entire hackathon. Every API call
   goes through `SectorsClient`, which caches, de-duplicates in-flight requests,
   and meters against a ledger that can refuse. Never call `fetch` against
   `api.sectors.app` directly. Request only the report sections you need: the
   default is all eight and costs 8 credits.

4. **The API key is server-only.** `src/lib/env.ts` throws if imported in the
   browser. Keep it that way.

5. **Validate third-party JSON at the boundary.** Everything from the API is
   parsed through the Zod schemas in `src/lib/sectors/schemas.ts`. An upstream
   shape change must surface as a named error, never as `undefined` reaching a
   statistical function.

## Sectors API quirks found the hard way

These cost real debugging time. Check here before assuming a bug is ours.

- **The index endpoint returns `price`, not `close`.** Parsing an index series
  with `parseDailySeries` silently drops every row, which empties the date
  intersection in `alignSeries` and makes every twin fail with "0 of 30
  sessions". Use `parseIndexSeries`. There is a test pinning that the two
  parsers are not interchangeable.
- **Index codes are lowercase.** `/v2/index-daily/IHSG/` returns 400; `ihsg`
  works.
- **`/v2/daily/` returns far less than 90 days when the window is omitted.**
  About 21 sessions against 62 for an explicit range, so always pass start and
  end. `clampWindow` does this.
- **Seasonality is inherently partial.** The 90 day cap means one fetch covers
  three or four calendar months, so the panel says so rather than presenting a
  fragment as a seasonal profile.
- **EPS and similar per-share figures arrive as long decimals.** Indonesian
  formatting uses the full stop as a thousands separator, so an unrounded
  377.5732 reads as 377 thousand. `formatIdr` rounds before formatting.

## Layout

| Path | Responsibility |
| --- | --- |
| `src/lib/sectors/` | API client, cache, credit ledger, response schemas |
| `src/lib/shadow/` | Twin construction, similarity scoring, attribution |
| `src/lib/smartmoney/` | Institutional and foreign positioning |
| `src/lib/analysis/` | Reality check: narrative against price |
| `src/lib/intelligence/` | Daily run, market brief, track record, calendar |
| `src/app/` | Next.js App Router pages and route handlers |

`src/lib/**` is pure and dependency-free where possible, which is what makes it
testable without network or database.

## The daily run

Vercel Cron calls `/api/cron/alerts` (GET, bearer `CRON_SECRET`) after the
close on weekdays. The route answers at once, works in `after()`, and calls
itself again while stocks remain, so the day is many short function runs
rather than one long one. See `src/lib/intelligence/pipeline.ts`.

- One queue item per stock, claimed atomically, so overlapping steps never
  analyse the same stock twice. A stale claim is retried, then marked failed.
- Capped by `AUTOMATION_DAILY_CREDIT_CAP`, checked before each stock, and it
  never draws on the ledger's reserve. Watched stocks are queued first.
- Each result is stored as a `SignalSnapshot`. Alerts, the brief page and the
  brief email are built from snapshots and never spend a credit.
- Later runs fill in what happened after each snapshot. The track record
  refuses to show a rate below `MIN_SAMPLE` resolved signals.
- Functions run in `sin1`, next to the Neon database in Singapore. Running
  them in the default US region made every query cross the Pacific.

## Conventions

- **Interface copy is written in coherent prose without em dashes.** This
  applies to user-facing strings, including the `findings` and `caveats` text
  generated in the analysis modules.
- Comments explain *why*, not *what*. The threshold constants in the engines
  carry their reasoning because a future reader will otherwise assume they were
  fitted rather than chosen.
- Numeric fields from the API are nullable. Treat null as "no evidence", which
  scores 0, rather than coercing to a number.

## Before committing

```bash
npm run typecheck && npm test && npm run lint
```

Coverage on `src/lib` has an 80% floor. The engines are where a silent error
becomes a wrong trading signal, so tests there cover the refusal paths as
carefully as the happy paths.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
