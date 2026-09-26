import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WatchlistManager } from "@/components/WatchlistManager";
import { NotificationList } from "@/components/NotificationList";
import { Card, CardHeader, Container, InkPanel, PageHeader } from "@/components/ui/primitives";
import { getTranslator } from "@/lib/i18n/server";
import { setBriefOptIn } from "./actions";

export const metadata = {
  title: "Watchlist | SHADOW IDX",
  description:
    "Track Indonesian stocks and receive an alert when one moves beyond what comparable companies explain.",
};

export const dynamic = "force-dynamic";

/**
 * Reached only with a valid session: middleware (src/middleware.ts) redirects
 * a signed-out visitor to /signin before this page ever renders. getCurrentUser
 * is still called and still checked, since middleware only verifies the
 * cookie's signature and expiry, not the database-backed passwordChangedAt
 * invalidation that a very recent password reset relies on.
 */
export default async function WatchlistPage() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getTranslator()]);

  if (!user) {
    return (
      <Container className="space-y-8 py-8 lg:py-10">
        <PageHeader title={t("watchlist.title")} description={t("auth.gate.body")} />
      </Container>
    );
  }

  const [items, holdings, notifications, preferences] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.holding.findMany({ where: { userId: user.id } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { briefOptIn: true } }),
  ]);
  const briefOptIn = preferences?.briefOptIn ?? false;

  const holdingBySymbol = new Map(holdings.map((h) => [h.symbol, h]));

  return (
    <Container className="space-y-8 py-8 lg:py-10">
      <PageHeader
        title={t("watchlist.title")}
        description={t("watchlist.description")}
        actions={
          <span className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted">
            {user.email}
          </span>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader
            title={t("watchlist.trackedTitle")}
            description={t("watchlist.trackedDescription")}
          />
          <WatchlistManager
            items={items.map((item) => ({
              symbol: item.symbol,
              zScoreThreshold: item.zScoreThreshold,
              lastNotifiedAt: item.lastNotifiedAt?.toISOString() ?? null,
              holding: holdingBySymbol.get(item.symbol)
                ? {
                    lots: holdingBySymbol.get(item.symbol)!.lots,
                    avgPrice: holdingBySymbol.get(item.symbol)!.avgPrice,
                  }
                : null,
            }))}
          />
        </Card>

        <InkPanel>
          <CardHeader
            title={t("watchlist.alertsTitle")}
            description={t("watchlist.alertsDescription")}
          />
          <NotificationList
            notifications={notifications.map((n) => ({
              id: n.id,
              symbol: n.symbol,
              kind: n.kind,
              title: n.title,
              body: n.body,
              createdAt: n.createdAt.toISOString(),
              read: n.readAt !== null,
            }))}
          />
        </InkPanel>
      </div>

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
    </Container>
  );
}
