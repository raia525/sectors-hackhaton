import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { SectionTabs } from "@/components/SectionTabs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Portfolio: the signed-in user's own stocks, and the alerts about them. A
 * session ended by a password change or "sign out everywhere" still passes
 * the proxy's signature check, so it is sent to sign in again here rather
 * than shown an empty page.
 */
export default async function PortfolioLayout({ children }: { children: ReactNode }) {
  const [user, { t }] = await Promise.all([getCurrentUser(), getTranslator()]);
  if (!user) redirect("/signin?next=/portfolio");

  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

  return (
    <Container className="space-y-6 py-8 lg:py-10">
      <SectionTabs
        label={t("nav.portfolio")}
        items={[
          { href: "/portfolio", label: t("portfolio.tab.watchlist") },
          {
            href: "/portfolio/alerts",
            label: t("portfolio.tab.alerts"),
            count: unread,
            countLabel: t("alerts.unreadCount", { count: unread }),
          },
        ]}
      />
      {children}
    </Container>
  );
}
