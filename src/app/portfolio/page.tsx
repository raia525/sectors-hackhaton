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
import { setBriefOptIn } from "./actions";

export const metadata = {
  title: "Portfolio | SHADOW IDX",
  description:
    "Track Indonesian stocks and receive an alert when one moves beyond what comparable companies explain.",
};

/** Watchlist: the summary of the user's stocks, then each stock and its settings. */
export default async function PortfolioPage() {
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

            return {
              symbol: item.symbol,
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

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-[16px] font-bold text-text">{t("watchlist.briefTitle")}</h2>
            <p className="mt-1 text-sm text-text-muted">{t("watchlist.briefDescription")}</p>
            <p className="mt-2 text-xs font-semibold text-text-subtle">
              {briefOptIn ? t("watchlist.briefStatusOn") : t("watchlist.briefStatusOff")}
            </p>
          </div>
          <form action={setBriefOptIn}>
            <input type="hidden" name="enabled" value={briefOptIn ? "false" : "true"} />
            <button
              type="submit"
              className={
                briefOptIn
                  ? "rounded-full border border-border-strong px-5 py-2.5 text-sm font-bold text-text transition-colors hover:bg-surface-raised"
                  : "rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-contrast transition-colors hover:bg-accent-hover"
              }
            >
              {briefOptIn ? t("watchlist.briefOff") : t("watchlist.briefOn")}
            </button>
          </form>
        </div>
      </Card>
    </>
  );
}
