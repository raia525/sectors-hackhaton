import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WatchlistManager } from "@/components/WatchlistManager";
import { NotificationList } from "@/components/NotificationList";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";

export const metadata = {
  title: "Watchlist | SHADOW IDX",
  description:
    "Track Indonesian stocks and receive an alert when one moves beyond what comparable companies explain.",
};

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Watchlist</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-muted">
          Track stocks and receive an alert when one moves beyond what
          comparable companies explain. Alerts are deliberately rare: a
          notification people learn to ignore is worse than none at all.
        </p>
        <div className="mt-8">
          <EmptyState
            title="Sign in to build a watchlist"
            description="Your watchlist, positions, and alert thresholds are stored against your account."
          />
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/signin"
              className="rounded-[8px] bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-[8px] border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              Create an account
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
            Watchlist
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
            You are alerted when a stock moves beyond what comparable companies
            explain, not when it simply moves. Set the bar per stock.
          </p>
        </div>
        <p className="text-sm text-text-subtle">{user.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader
            title="Tracked stocks"
            description="Each stock carries its own alert threshold, measured in standard deviations of its own divergence history."
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
            title="Recent alerts"
            description="Alerts are rate limited, so a stock parked above its threshold produces one notification rather than one per run."
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
