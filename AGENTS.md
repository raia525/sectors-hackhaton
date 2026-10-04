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
| `src/lib/admin/` | Pure checks behind the admin panel: content overrides, palettes, uploads, schedules |
| `src/lib/brand/` | Per-request site settings: palette, logo, favicon, text overrides, announcements |
| `src/lib/settings/` | Admin app settings and per-user preferences, parsed with defaults |
| `src/lib/chat/` | The Grok chatbot: stream parsing, prompt rules, read-only tools |
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

## Sections, conclusions and settings

The signed-in app has three menus, each with tabs (`SectionTabs`): Market
(`/market`, sectors, track record), Stocks (`/stocks` analyse, compare,
ticker list) and Portfolio (`/portfolio` watchlist, alerts, calendar).
`/brief`, `/compare` and `/watchlist` redirect (next.config.ts), and
`/?symbol=` goes to `/stocks?symbol=`, because sent emails link there.

- Every page that shows an analysis opens with a `ConclusionBlock` built by
  `src/lib/intelligence/summary.ts`. It only picks sentences from figures
  the engines produced. A weak twin, too few peers or too little history
  makes the conclusion a refusal, said first.
- Admin settings live in `AppSetting` rows, one per group, parsed by
  `src/lib/settings/app.ts`. Signal bars (`SIGNAL_Z`, `FIT_FLOOR`,
  `MIN_PEERS`) can be raised but never lowered below the shipped values.
  Engines take them as a `bars` parameter that defaults to the constants.
- User preferences (panel layout, start page, default alert level) are JSON
  on `User.preferences`, parsed by `src/lib/settings/user.ts`.
- Sectors in the ticker directory are learnt from stored analyses, never
  fetched for every company (about 950 credits). The list says how many
  sectors it knows.

## Watchlist facts and alert rules

- Each `SignalSnapshot` also stores `keyStats` and `marketFacts` (last
  close, daily and 5-day change, volume against its 20-day average, daily
  volatility). They come from data the analysis already fetched, so they
  cost no credit. Read them through `readSnapshotFacts`
  (`src/lib/intelligence/watch-facts.ts`); older snapshots have none, and
  that reads as "not known", never zero.
- The watchlist conclusion (`portfolioFacts` and `concludePortfolio`) is
  limited to the user's current watchlist, alert counts included. Financial
  points use the latest quarter's YoY growth and say so; the data has no
  earnings calendar, so nothing claims a report date.
- `AlertRule` rows are the user's own conditions (price, volume, PE and so
  on, with `<`, `<=`, `=`, `>=`, `>`), evaluated in `deliverAlerts` after
  each daily run, never intraday. They are edge triggered (fire when the
  condition becomes true, re-arm once it is false), a missing metric never
  fires, and `=` has a tolerance of one price tick or 0.5%. Suggested rules
  are computed on the server from stored facts (`suggestRules`); with
  `autoTune` the value is recomputed after each run, and editing it by hand
  turns that off.

## Indonesian glossary

One term per concept, held by a test in `dictionary.test.ts`: twin =
kembaran (kembaran sintetis), peer = pembanding, similarity = kemiripan,
market = pasar, stock specific = khusus saham, coverage = liputan berita,
fit = kecocokan, foreign flow = aliran dana asing, positioning = posisi.
Return, watchlist, z-score and smart money stay in English.

## The chatbot

`/api/chat` streams Grok (xAI, OpenAI compatible, plain fetch) replies as
NDJSON. `XAI_API_KEY` is optional and server only; without it the widget is
hidden. The model answers through tools that read stored data only, so a
question never spends a Sectors credit, and `get_watchlist` uses the
session's user id, never one the model supplies. The prompt rules (no
advice, no "insider", name the data date, no em dash) are tested; em dashes
are also stripped server side, and the widget renders only links to the
app's own analysis pages. Admin > Settings holds the model, on/off and the
daily per-user limit.

## Admin, roles and branding

`User.role` is `USER` or `ADMIN`. The panel lives under `/admin`.

- `requireAdmin()` answers 404, not 403, so the panel's existence is not
  revealed. Nothing a regular user's browser receives may name the panel:
  its copy lives in the server-only `admin-dictionary.ts`, handed to client
  components through `I18nExtension` inside admin pages only, and the menu
  entry arrives as a prop for admins only. A test fails if a public
  dictionary key or value mentions admin; keep client-side comments
  neutral too. Every admin server action calls it again, because an action is
  a public endpoint, and writes an `AdminAuditLog` row.
- Grant the role with `npm run admin:grant -- <email>` (or the same script
  under `dotenv -e .env.production.local` for production). The account must
  exist first.
- A session is stale if issued before `passwordChangedAt` or
  `sessionsRevokedAt`. `getSessionUserId` goes through `getCurrentUser`
  so this applies to server actions too. The proxy checks only the cookie
  signature, by design.
- Palette, logo, favicon, landing text overrides and announcements are read
  once per request by `getSiteSettings()`, which falls back to the built-in
  values on any error. Palette hexes are validated before they reach the
  `<style>` tag. Uploads are typed by their bytes, never the client's claim,
  and SVGs with script or external references are refused and served with a
  sandbox CSP anyway.
- Brand colours in components must come from the tokens
  (`var(--accent-bright)` and friends), never a hard-coded hex, or a palette
  change will miss them. Emails are the exception: mail clients cannot read
  CSS variables, so they keep the built-in orange.
- The daily run's stock list is the active `UniverseStock` rows in order,
  or `MARKET_UNIVERSE` when there are none.
- `ActionForm` submits from `onSubmit` rather than the `action` prop, so a
  refused form keeps what was typed. React resets `action` forms even on
  an error.

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
