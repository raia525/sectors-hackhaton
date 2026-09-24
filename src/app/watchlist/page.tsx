import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WatchlistManager } from "@/components/WatchlistManager";
import { NotificationList } from "@/components/NotificationList";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = {
  title: "Watchlist | SHADOW IDX",
  description:
    "Track Indonesian stocks and receive an alert when one moves beyond what comparable companies explain.",
};

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getTranslator()]);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {t("watchlist.title")}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-muted">
          {t("watchlist.signedOutDescription")}
        </p>
        <div className="mt-8">
          <EmptyState
            title={t("watchlist.signInPrompt")}
            description={t("watchlist.signInDescription")}
          />
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/signin"
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              {t("watchlist.createAccount")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [items, holdings, notifications] = await Promise.all([
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
  ]);

  const holdingBySymbol = new Map(holdings.map((h) => [h.symbol, h]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {t("watchlist.title")}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
            {t("watchlist.description")}
          </p>
        </div>
        <p className="text-sm text-text-subtle">{user.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
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

        <Card>
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
        </Card>
      </div>
    </div>
  );
}
