# SHADOW IDX

**Every stock has a shadow. We detect when reality breaks away from it.**

Sectors Hackathon 2026, Track 3: Market Intelligence.

---

## The problem in one sentence

When a stock moves 7%, no Indonesian retail platform tells you whether it moved because the market moved, because its sector moved, or because something is happening to that company specifically.

## Why that matters

Every IDX app shows the same thing: a price, a percentage, a volume bar, a handful of ratios. None of it answers the only question that changes a decision. A 7% jump in BBRI is unremarkable if IHSG rose 6% and every bank rose with it. The same 7% is worth investigating if the market was flat and no comparable bank moved at all.

Without that separation, people trade on noise and mistake it for signal. Coverage makes it worse: a stock surrounded by good headlines feels like a buy even when its price is doing nothing its peers have not already done.

## The approach

SHADOW IDX builds a **synthetic twin** for a stock, then measures where the real stock departs from it.

For a target such as BBRI, the system constructs a virtual portfolio from companies that resemble it historically across sub-sector, market capitalisation, price behaviour, volatility, revenue and earnings growth, dividend profile, and return correlation. Peers are weighted by similarity and rescaled to match the target's volatility. The result is a twin that captures everything about BBRI that is *not* specific to BBRI.

The gap between the two is the signal:

```
Actual return  =  Market  +  Sector/Peers  +  Stock-specific
                     ↑          ↑                 ↑
                 index beta   the shadow    what's left over
```

Only the third term is information about the company. It is the number the product exists to surface, expressed as a z-score against the stock's own divergence history so "unusual" means unusual *for this stock*.

## What it does

**1. Synthetic twin and divergence attribution**
Decomposes any IDX stock's move into market, sector, and stock-specific components that sum exactly to the total return. Every twin is auditable: the constituents, their weights, and their per-dimension similarity scores are all visible.

**2. Reality check (news against tape)**
Compares narrative tone against what the price actually did, and reports where they **disagree**. Four outcomes matter: coverage and price confirm each other, the narrative is running ahead of a price that has not moved, the price is moving before the story is public, or the two flatly contradict. Disagreement is the output, because that is where a user should slow down.

**3. Smart money divergence**
Detects when institutional and foreign positioning runs against price: accumulation into a falling stock, or distribution into a rally. Produces a conviction score for the strength of the disagreement, never for the odds of a future return.

A scoping note, because it governs what the feature claims. The classic signal here is *insider* cluster-buying, from director and commissioner filings. The Sectors API does not publish those. It publishes daily net foreign flow and monthly ownership by investor category, so that is what this measures, and it says so. A test asserts the word "insider" never appears in its findings.

**4. Stock comparison**
Ranks up to four stocks by how far each has broken from its own twin, rather than by return. A large return that a stock's peers also produced says nothing about the company.

**5. Corporate actions against your position**
Dividends and splits expressed as their effect on a holding: rupiah received, share count after the action, adjusted cost basis. A split states both halves of the adjustment, so it cannot be misread as creating value.

**6. Seasonality with honest sample sizes**
Month-by-month statistics that report how many years each figure rests on and refuse to call anything a tendency below four years of history.

**7. Watchlist alerts**
Per-stock thresholds in standard deviations, delivered in-app and by email. Alerts are rate limited and require the situation to have materially changed before repeating, because a notification people learn to ignore is worse than none.

## Honesty by construction

Financial tooling fails when it presents a confident number built on thin evidence. Several design decisions exist specifically to prevent that:

- **The twin reports its own fit.** R² is computed and displayed. Below 30%, the UI says the divergence is indicative rather than conclusive.
- **Thin data produces no signal, not a weak one.** Fewer than 30 overlapping sessions, or no peer clearing the similarity floor, returns an explicit refusal rather than a chart.
- **Z-scores require history.** With under 20 prior sessions the score is reported as zero instead of a confident-looking number from a handful of points.
- **Convex peer weights, not unconstrained regression.** An OLS fit on correlated peers produces large offsetting positions that overfit the window and collapse out of sample, making divergence look small right up until it looks absurd. Similarity-weighted convex weights stay interpretable as a real portfolio and degrade gracefully.
- **Claims are limited to what the data supports.** The smart money module measures institutional and foreign flow. It never describes this as insider activity, because the data source publishes no director-level dealings.
- **Nothing here is a forecast.** Every analysis states what was observed, and says so.

## Architecture

```
src/
  lib/
    sectors/        API client, cache, credit ledger, response schemas
    shadow/         Synthetic twin construction and divergence attribution
    smartmoney/     Institutional and foreign positioning
    analysis/       Reality check, corporate actions, seasonality, comparison
    notifications/  Alert rules, digest rendering, scheduled dispatch
  components/       UI, mostly server components
  app/              App Router pages and route handlers
prisma/             Database schema
```

`src/lib/**` is pure and free of I/O wherever possible, which is what makes the analysis testable without a network or a database.

**Credit discipline.** The hackathon grants 1,000 API credits total, and a single twin touches one report plus a daily series per peer. Overspending is a build-ending failure, so it is enforced in code rather than tracked by hand: every call passes through a cache, then in-flight de-duplication, then a ledger that can refuse the request. A reserve is held back so background jobs cannot starve the live demo, and failed calls are refunded.

**Security.**

- The API key is server-only. `server-only` imports make an accidental client import a build error rather than a leaked secret, and that guard caught a real leak during development.
- Environment variables are schema-validated at startup, so a missing secret fails loudly and by name instead of becoming an `undefined` in an `Authorization` header.
- All third-party JSON is parsed through runtime schemas at the boundary.
- Passwords use scrypt with per-user salts. Session cookies are HMAC-signed, httpOnly, and sameSite lax.
- Every secret comparison is timing-safe, including the scheduled job's bearer token.
- Authentication failures are deliberately indistinguishable, so the sign-in form cannot be used to enumerate registered email addresses.
- Email templates escape every interpolated value, since alert bodies carry API-sourced text.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in SECTORS_API_KEY
npx prisma migrate dev       # optional, see below
npm run dev
```

The app runs without a database, falling back to an in-memory cache and credit ledger. It also falls back automatically if a configured database stops answering, warning once rather than failing every page. The budget stays enforced either way; it simply resets on restart. The watchlist needs Postgres, so set `DATABASE_URL` and run the migration for the full feature set.

`/preview` renders every analysis panel from fixed synthetic data, so layout and number formatting can be reviewed without spending credits. It returns 404 in production.

`/api/health` reports which capabilities are actually working: environment validity, whether storage is durable, credits spent, and whether email is configured. Add `?smtp=1` to open a real SMTP connection and verify it.

### Email

Alerts are delivered over SMTP, which works with any relay rather than tying the project to one vendor. Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` and `NOTIFICATION_FROM_EMAIL`; for Gmail, generate an [app password](https://myaccount.google.com/apppasswords), since a normal account password is rejected. Port 465 uses implicit TLS, and any other port is required to upgrade through STARTTLS, so credentials never cross an unencrypted connection.

Without a complete set, alerts are still saved in the app and nothing is mailed.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | Test suite, 193 tests |
| `npm run test:coverage` | Coverage, 85% floor on the analysis modules |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |

### Scheduled alerts

The alert job is a POST to `/api/cron/alerts` with `Authorization: Bearer $CRON_SECRET`. `vercel.json` schedules it for 10:00 UTC on weekdays, which is 17:00 WIB, an hour after the IDX close, so each run sees a settled closing price. Anywhere else, any scheduler that can send an authenticated POST will do.

The endpoint rejects GET, so it cannot be triggered by a crawler or a pasted link.

## Data source

All market data comes from the [Sectors API](https://sectors.app/api): company reports, daily transactions, corporate actions, news, index series, foreign flow, and shareholder composition. The API is the analytical foundation, not a decorative call.

## Licence

MIT
