import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { loadPortfolio } from "@/lib/intelligence/portfolio";
import { concludePortfolio } from "@/lib/intelligence/summary";
import { isSignal } from "@/lib/intelligence/track-record";
import { getSignalBars } from "@/lib/settings/server";
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
      />

      <Card>
        <CardHeader title={t("watchlist.trackedTitle")} description={t("watchlist.trackedDescription")} />
        <WatchlistManager
          defaultThreshold={preferences.defaultThreshold}
          items={portfolio.items.map((item) => {
            const holding = portfolio.holdingBySymbol.get(item.symbol);
            const latest = portfolio.latestBySymbol.get(item.symbol);
            return {
              symbol: item.symbol,
              zScoreThreshold: item.zScoreThreshold,
              notifyOnCorporateAction: item.notifyOnCorporateAction,
              notifyOnSmartMoney: item.notifyOnSmartMoney,
              lastNotifiedAt: item.lastNotifiedAt?.toISOString() ?? null,
              holding: holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
              latest: latest
                ? { zScore: latest.zScore, runDate: latest.runDate, signal: isSignal(latest, bars) }
                : null,
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
