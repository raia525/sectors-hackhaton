"use client";

import Link from "next/link";
import type { KeyStats } from "@/lib/analysis/key-stats";
import type { CorporateActionItem } from "@/lib/analysis/corporate-actions";
import type { MarketFacts } from "@/lib/analysis/market-facts";
import type { ConclusionTone } from "@/lib/intelligence/summary";
import { useTranslation } from "@/lib/i18n/client";
import { formatIdr, formatPercent } from "@/lib/format";
import { ConclusionBlock } from "./ConclusionBlock";
import { KeyStatsPanel } from "./KeyStatsPanel";
import { CorporateActionsPanel } from "./CorporateActionsPanel";

/**
 * One watched stock's latest stored analysis, opened from its watchlist
 * row. Everything here comes from the daily run's snapshot, so opening it
 * spends no credit; the link at the bottom runs a fresh analysis, which
 * does, and says so.
 */

export interface StockDetail {
  runDate: string;
  conclusion: { tone: ConclusionTone; toneLabel: string; headline: string; points: string[] };
  split: { total: number; market: number; sector: number; idio: number; z: number; fit: number; peers: number };
  news: string;
  smartMoney: string | null;
  prices: MarketFacts | null;
  keyStats: KeyStats | null;
  actions: CorporateActionItem[];
  hasPosition: boolean;
  caveats: string[];
}

export function WatchlistDetail({ symbol, detail }: { symbol: string; detail: StockDetail | null }) {
  const { t } = useTranslation();

  if (!detail) {
    return (
      <div className="space-y-2 text-sm text-text-muted">
        <p>{t("watchDetail.none")}</p>
        <Link href={`/stocks?symbol=${symbol}`} className="font-semibold text-accent hover:underline">
          {t("watchDetail.runFull")}
        </Link>
      </div>
    );
  }

  const { split, prices } = detail;
  const figures: { label: string; value: string; tone?: "up" | "down" }[] = [
    { label: t("attribution.market"), value: formatPercent(split.market) },
    { label: t("watchDetail.peers"), value: formatPercent(split.sector) },
    {
      label: t("attribution.specific"),
      value: formatPercent(split.idio),
      tone: split.idio >= 0 ? "up" : "down",
    },
    { label: t("verdict.stat.zScore"), value: split.z.toFixed(2) },
    { label: t("verdict.stat.twinFit"), value: `${Math.round(split.fit * 100)}%` },
    { label: t("verdict.stat.peersUsed"), value: String(split.peers) },
  ];
  const session: { label: string; value: string }[] = prices
    ? [
        { label: t("watchDetail.close"), value: prices.lastClose === null ? "-" : formatIdr(prices.lastClose) },
        { label: t("watchDetail.change"), value: prices.change1d === null ? "-" : formatPercent(prices.change1d) },
        { label: t("watchDetail.change5d"), value: prices.return5d === null ? "-" : formatPercent(prices.return5d) },
        {
          label: t("watchDetail.volume"),
          value:
            prices.volume === null
              ? "-"
              : prices.volumeRatio === null
                ? Math.round(prices.volume).toLocaleString("id-ID")
                : t("watchDetail.volumeVsAvg", {
                    volume: Math.round(prices.volume).toLocaleString("id-ID"),
                    ratio: prices.volumeRatio.toFixed(1),
                  }),
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={detail.conclusion.toneLabel}
        tone={detail.conclusion.tone}
        headline={detail.conclusion.headline}
        points={detail.conclusion.points}
        footnote={t("watchDetail.stored", { date: detail.runDate })}
      />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {figures.map((f) => (
          <div key={f.label} className="rounded-[var(--radius-sm)] bg-surface p-3">
            <dt className="text-[11px] uppercase tracking-wide text-text-subtle">{f.label}</dt>
            <dd className={`tnum mt-1 text-sm font-bold ${f.tone === "up" ? "text-up" : f.tone === "down" ? "text-down" : "text-text"}`}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="rounded-[var(--radius-sm)] bg-surface p-3 text-text-muted">
          <span className="block text-[11px] uppercase tracking-wide text-text-subtle">{t("watchDetail.news")}</span>
          {detail.news}
        </p>
        <p className="rounded-[var(--radius-sm)] bg-surface p-3 text-text-muted">
          <span className="block text-[11px] uppercase tracking-wide text-text-subtle">{t("analysis.smartMoneyTitle")}</span>
          {detail.smartMoney ?? t("watchDetail.noSmartMoney")}
        </p>
      </div>

      {session.length > 0 ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {session.map((f) => (
            <div key={f.label} className="rounded-[var(--radius-sm)] bg-surface p-3">
              <dt className="text-[11px] uppercase tracking-wide text-text-subtle">{f.label}</dt>
              <dd className="tnum mt-1 text-sm font-bold text-text">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {detail.keyStats ? (
        <div className="rounded-[var(--radius-sm)] bg-surface p-4">
          <KeyStatsPanel stats={detail.keyStats} />
        </div>
      ) : (
        <p className="text-xs text-text-subtle">{t("watchDetail.noStats")}</p>
      )}

      <div className="rounded-[var(--radius-sm)] bg-surface p-4">
        <p className="mb-2 text-sm font-bold text-text">{t("analysis.actionsTitle")}</p>
        <CorporateActionsPanel items={detail.actions} upcomingIncomeIdr={null} hasPosition={detail.hasPosition} />
      </div>

      {detail.caveats.length > 0 ? (
        <ul className="space-y-1 text-xs text-text-subtle">
          {detail.caveats.map((c, i) => (
            <li key={i}>· {c}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-text-subtle">
        <Link href={`/stocks?symbol=${symbol}`} className="font-semibold text-accent hover:underline">
          {t("watchDetail.runFull")}
        </Link>{" "}
        {t("watchDetail.runFullHint")}
      </p>
    </div>
  );
}
