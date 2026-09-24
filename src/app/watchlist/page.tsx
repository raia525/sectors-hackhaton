import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WatchlistManager } from "@/components/WatchlistManager";
import { NotificationList } from "@/components/NotificationList";
import {
  Card,
  CardHeader,
  Container,
  IconBadge,
  InkPanel,
  PageHeader,
} from "@/components/ui/primitives";
import { IconBell } from "@/components/ui/icons";
import { AuthBenefits } from "@/components/AuthBenefits";
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
      <Container className="space-y-8 py-8 lg:py-10">
        <PageHeader
          title={t("watchlist.title")}
          description={t("watchlist.signedOutDescription")}
        />
        <InkPanel className="grid gap-8 p-8 lg:grid-cols-[1fr_1fr] lg:p-10">
          <div>
            <IconBadge>
              <IconBell />
            </IconBadge>
            <h2 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight text-text">
              {t("watchlist.signInPrompt")}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
              {t("watchlist.signInDescription")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/signin"
                className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                {t("nav.signIn")}
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-border-strong px-6 py-3 text-sm font-bold text-text transition-colors hover:bg-surface-raised"
              >
                {t("watchlist.createAccount")}
              </Link>
            </div>
          </div>
          <AuthBenefits />
        </InkPanel>
      </Container>
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
    </Container>
  );
}
