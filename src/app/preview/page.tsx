import { notFound } from "next/navigation";
import { KeyStatsPanel } from "@/components/KeyStatsPanel";
import { CorporateActionsPanel } from "@/components/CorporateActionsPanel";
import { SeasonalityPanel } from "@/components/SeasonalityPanel";
import { SmartMoneyPanel } from "@/components/SmartMoneyPanel";
import { Card, CardHeader } from "@/components/ui/primitives";
import { buildKeyStats } from "@/lib/analysis/key-stats";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import { analyzeSeasonality } from "@/lib/analysis/seasonality";
import { analyzeSmartMoney } from "@/lib/smartmoney/engine";
import { companyReportSchema } from "@/lib/sectors/schemas";
import type { DailyBar } from "@/lib/shadow/types";

/**
 * Component preview with synthetic data.
 *
 * The panels can only be seen against a live API key, which makes reviewing
 * their layout, empty states and number formatting awkward during development.
 * This page renders them from fixed fixtures instead.
 *
 * It is development-only: in production it returns a 404, so it cannot be
 * mistaken for real analysis or indexed.
 */

export const dynamic = "force-dynamic";

function makeBars(): DailyBar[] {
  const bars: DailyBar[] = [];
  let price = 4200;
  // Three years, so seasonality has some months above its reliability floor
  // and some below, which is the interesting case to look at.
  for (let year = 2022; year <= 2025; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [2, 14, 26]) {
        price *= 1 + (month === 12 ? 0.018 : month === 8 ? -0.012 : 0.002);
        bars.push({
          date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          close: Math.round(price),
          open: null,
          high: null,
          low: null,
          volume: 85_000_000,
          marketCap: Math.round(price) * 151_000_000_000,
        });
      }
    }
  }
  return bars;
}

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const bars = makeBars();
  const last = bars.at(-1)!.close;

  const report = companyReportSchema.parse({
    symbol: "BBRI.JK",
    company_name: "Bank Rakyat Indonesia (Persero) Tbk",
    overview: {
      sector: "Financials",
      sub_sector: "Banks",
      market_cap: 712_400_000_000_000,
      last_close_price: last,
      daily_close_change: 0.0182,
      employee_num: 78_400,
      all_time_price: {
        "52_w_low": { "2025-01-14": Math.round(last * 0.76) },
        "52_w_high": { "2025-05-02": Math.round(last * 1.09) },
      },
    },
    financials: {
      eps: 412,
      yoy_quarter_revenue_growth: 0.083,
      yoy_quarter_earnings_growth: 0.121,
      historical_financials: [
        {
          year: 2024,
          revenue: 187_000_000_000_000,
          earnings: 60_100_000_000_000,
          total_equity: 318_000_000_000_000,
          total_liabilities: 1_642_000_000_000_000,
        },
      ],
    },
    dividend: { yield_ttm: 0.0643, payout_ratio: 0.805 },
    valuation: {
      historical_valuation: [{ year: 2024, pe: 11.4, pb: 2.31, pe_peer_avg: 13.8 }],
    },
  });

  const corporateActions = summarizeCorporateActions(
    {
      symbol: "BBRI.JK",
      corporate_actions: {
        dividend: [
          {
            ex_date: "2026-10-12",
            payment_date: "2026-10-28",
            dividend_amount: 168,
            dividend_yield: 0.0341,
          },
          {
            ex_date: "2026-03-20",
            payment_date: "2026-04-08",
            dividend_amount: 142,
            dividend_yield: 0.0302,
          },
        ],
        stock_split: [{ date: "2026-11-05", split_ratio: 2 }],
        agm: [{ agm_date: "2026-03-12", agm_result: "Dividend and board changes approved." }],
        bonus: null,
        warrant: null,
        right_issue: null,
        upcoming_dividend: null,
      },
    },
    { lots: 25, avgPrice: 4150 },
    new Date("2026-09-22T00:00:00Z"),
  );

  const upcomingIncomeIdr = corporateActions
    .filter((a) => a.timing === "upcoming" && a.effect?.cashIdr)
    .reduce((sum, a) => sum + (a.effect?.cashIdr ?? 0), 0);

  const tradedValue = bars.reduce((s, b) => s + b.close * b.volume, 0);
  const smartMoney = analyzeSmartMoney({
    symbol: "BBRI",
    bars: bars.slice(-60),
    foreignFlow: bars.slice(-60).map((b) => ({
      date: b.date,
      netInflow: (tradedValue * 0.0009) / 60,
      buyIdr: null,
      sellIdr: null,
      foreignShare: 0.61,
    })),
    ownership: [1, 2, 3, 4, 5, 6].map((m) => ({
      date: `2026-0${m}-28`,
      sharesOutstanding: 151_000_000_000,
      institutionalLocal: Math.round(151_000_000_000 * (0.40 + m * 0.004)),
      institutionalForeign: Math.round(151_000_000_000 * 0.22),
      individualLocal: Math.round(151_000_000_000 * (0.20 - m * 0.003)),
      individualForeign: 0,
      numberOfShareholders: 380_000,
    })),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Component preview
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Synthetic data, for checking layout and formatting without spending
          API credits. Not reachable in production.
        </p>
      </div>

      <Card>
        <CardHeader title="Key statistics" description="Synthetic figures." />
        <KeyStatsPanel stats={buildKeyStats(report, bars)} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Corporate actions" description="With a 25 lot position." />
          <CorporateActionsPanel
            items={corporateActions}
            upcomingIncomeIdr={upcomingIncomeIdr}
            hasPosition
          />
        </Card>

        <Card>
          <CardHeader title="Seasonality" description="Four years of synthetic history." />
          <SeasonalityPanel data={analyzeSeasonality(bars)} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Smart money positioning" description="Synthetic flow." />
        <SmartMoneyPanel signal={smartMoney} />
      </Card>
    </div>
  );
}
