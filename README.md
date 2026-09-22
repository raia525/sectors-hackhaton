# SHADOW IDX

**Every stock has a shadow. We detect when reality breaks away from it.**

Sectors Hackathon 2026 — Track 3, Market Intelligence.

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
Detects when institutional and foreign positioning runs against price: accumulation into a falling stock, or distribution into a rally. Produces a conviction score for the strength of the disagreement.

**4. Comparison, summarisation, and notifications**
Side-by-side stock comparison, summarised key stats with corporate-action effects on a held position, seasonality, and scheduled alerts on a chosen watchlist delivered in-app and by email.

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
    sectors/      Sectors API client: typed, cached, credit-metered
    shadow/       Synthetic twin construction and divergence attribution
    smartmoney/   Institutional and foreign positioning analysis
    analysis/     Reality check, narrative against price
  app/            Next.js App Router pages and API routes
```

**Credit discipline.** The hackathon grants 1,000 API credits total, and a single twin touches one report plus a daily series per peer. Overspending is a build-ending failure, so it is enforced in code rather than tracked by hand: every call passes through a cache, then in-flight de-duplication, then a ledger that can refuse the request. A reserve is held back so background jobs cannot starve the live demo, and failed calls are refunded.

**Security.** The API key is server-only and never reaches the browser. Environment variables are schema-validated at startup so a missing secret fails loudly and by name. All third-party JSON is parsed through runtime schemas at the boundary, so an upstream shape change surfaces as a clear error rather than an `undefined` propagating into a statistical model.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in SECTORS_API_KEY
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | Test suite |
| `npm run test:coverage` | Coverage report, 80% floor on `src/lib` |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |

## Data source

All market data comes from the [Sectors API](https://sectors.app/api): company reports, daily transactions, corporate actions, news, index series, foreign flow, and shareholder composition. The API is the analytical foundation, not a decorative call.

## Licence

MIT
