import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { NotificationList } from "@/components/NotificationList";
import { InkPanel, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Alerts | SHADOW IDX" };

/** Alerts the daily run has sent this user, newest first. */
export default async function AlertsPage() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getTranslator()]);
  if (!user) redirect("/signin?next=/portfolio/alerts");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader title={t("watchlist.alertsTitle")} description={t("watchlist.alertsDescription")} />
      <InkPanel>
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
    </>
  );
}
