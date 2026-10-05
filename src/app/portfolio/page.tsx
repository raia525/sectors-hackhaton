import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { loadPortfolio } from "@/lib/intelligence/portfolio";
import { concludePortfolio, concludeStock } from "@/lib/intelligence/summary";
import { readStoredAnalysis } from "@/lib/intelligence/watch-facts";
import { getSignalBars } from "@/lib/settings/server";
import { metricValue, METRICS, suggestRules, type Metric } from "@/lib/notifications/custom-rules";
import { REALITY_COPY, SMART_MONEY_COPY } from "@/components/verdictCopy";
import type { StockDetail } from "@/components/WatchlistDetail";
import { parsePreferences } from "@/lib/settings/user";
import { WatchlistManager } from "@/components/WatchlistManager";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import Link from "next/link";
import { CalendarList } from "@/components/BriefSections";
import { CONCLUSION_ACTION_DAYS } from "@/lib/intelligence/portfolio";

export const metadata = {
  title: "Portfolio | SHADOW IDX",
  description:
    "Track Indonesian stocks and receive an alert when one moves beyond what comparable companies explain.",
};

/** Watchlist: the summary of the user's stocks, then each stock and its settings. */
export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const [user, { t, tm }, bars] = await Promise.all([getCurrentUser(), getTranslator(), getSignalBars()]);
  if (!user) redirect("/signin?next=/portfolio");

  const [portfolio, account] = await Promise.all([
    loadPortfolio(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { briefOptIn: true, preferences: true } }),
  ]);
  const briefOptIn = account?.briefOptIn ?? false;
  const preferences = parsePreferences(account?.preferences);
  const conclusion = concludePortfolio(portfolio.facts);

  return (
    <>
      <PageHeader title={t("watchlist.title")} description={t("watchlist.description")} />

      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={t(TONE_KEY[conclusion.tone])}
        tone={conclusion.tone}
        headline={tm(conclusion.headline)}
        points={conclusion.points.map((p) => tm(p))}
        footnote={
          portfolio.facts.asOf
            ? t("conclusion.portfolio.footnote", { date: portfolio.facts.asOf })
            : undefined
        }
      />

      <Card>
        <CardHeader title={t("watchlist.trackedTitle")} description={t("watchlist.trackedDescription")} />
        <WatchlistManager
          defaultThreshold={preferences.defaultThreshold}
          openSymbol={open?.toUpperCase() ?? null}
          items={portfolio.items.map((item) => {
            const holding = portfolio.holdingBySymbol.get(item.symbol);
            const stock = portfolio.stocks.get(item.symbol);
            const facts = stock?.facts ?? null;

            let detail: StockDetail | null = null;
            if (stock && facts) {
              const stored = readStoredAnalysis(stock.caveats);
              const upcoming = stock.actions
                .filter((x) => x.timing === "upcoming")
                .sort((x, y) => x.date.localeCompare(y.date));
              const c = concludeStock(
                {
                  symbol: item.symbol,
                  sessions: stored.fitWindow ?? 0,
                  zScore: facts.zScore,
                  fitQuality: facts.fitQuality,
                  peers: facts.peers,
                  total: facts.total,
                  market: facts.market,
                  sector: facts.sector,
                  idio: facts.idio,
                  realityVerdict: facts.realityVerdict,
                  upcoming: upcoming.map((x) => ({ kind: x.kind, date: x.date })),
                },
                bars,
              );
              const reality = REALITY_COPY[facts.realityVerdict as keyof typeof REALITY_COPY];
              const smart = facts.smartMoneyType
                ? SMART_MONEY_COPY[facts.smartMoneyType as keyof typeof SMART_MONEY_COPY]
                : undefined;
              detail = {
                runDate: facts.runDate,
                conclusion: {
                  tone: c.tone,
                  toneLabel: t(TONE_KEY[c.tone]),
                  headline: tm(c.headline),
                  points: c.points.map((p) => tm(p)),
                },
                split: {
                  total: facts.total,
                  market: facts.market,
                  sector: facts.sector,
                  idio: facts.idio,
                  z: facts.zScore,
                  fit: facts.fitQuality,
                  peers: facts.peers,
                },
                news: reality ? t(reality.labelKey) : facts.realityVerdict,
                smartMoney: smart
                  ? `${t(smart.labelKey)}. ${t(smart.meaningKey)}`
                  : null,
                prices: facts.prices,
                keyStats: facts.keyStats,
                actions: stock.actions,
                hasPosition: Boolean(holding),
                caveats: stored.caveats.map((m) => tm(m)),
              };
            }

            const current: Partial<Record<Metric, number | null>> = facts
              ? Object.fromEntries(METRICS.map((m) => [m, metricValue(facts, m)]))
              : {};

            const next = stock?.actions
              .filter((x) => x.timing === "upcoming")
              .sort((x, y) => x.date.localeCompare(y.date))[0];

            return {
              symbol: item.symbol,
              addedAt: item.createdAt.toISOString(),
              lastClose: facts?.prices?.lastClose ?? null,
              change1d: facts?.prices?.change1d ?? null,
              nextAction: next ? { date: next.date, label: tm(next.summary) } : null,
              zScoreThreshold: item.zScoreThreshold,
              notifyOnCorporateAction: item.notifyOnCorporateAction,
              notifyOnSmartMoney: item.notifyOnSmartMoney,
              lastNotifiedAt: item.lastNotifiedAt?.toISOString() ?? null,
              holding: holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
              latest: facts && stock ? { zScore: facts.zScore, runDate: facts.runDate, signal: stock.isSignal } : null,
              detail,
              rules: item.rules.map((r) => ({
                id: r.id,
                metric: r.metric,
                operator: r.operator,
                value: r.value,
                enabled: r.enabled,
                autoTune: r.autoTune,
                preset: r.preset,
                note: r.note,
                lastMet: r.lastMet,
                lastValue: r.lastValue,
                lastTriggeredAt: r.lastTriggeredAt?.toISOString() ?? null,
                tunedAt: r.tunedAt?.toISOString() ?? null,
              })),
              suggestions: facts ? suggestRules(facts, bars.signalZ) : [],
              current,
            };
          })}
        />
      </Card>

      <Card id="calendar" className="scroll-mt-24">
        <CardHeader
          title={t("watchlist.upcomingTitle", { days: CONCLUSION_ACTION_DAYS })}
          description={t("watchlist.upcomingDescription")}
        />
        {portfolio.items.length === 0 ? (
          <p className="text-sm text-text-muted">{t("brief.calendarNoWatchlist")}</p>
        ) : (
          <CalendarList entries={portfolio.upcoming} t={t} tm={tm} />
        )}
      </Card>

      <p className="text-sm text-text-muted">
        {briefOptIn ? t("watchlist.briefStatusOn") : t("watchlist.briefStatusOff")}{" "}
        <Link href="/account" className="font-semibold text-accent hover:underline">
          {t("watchlist.briefChange")}
        </Link>
      </p>
    </>
  );
}
