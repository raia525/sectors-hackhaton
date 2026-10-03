import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { latestRun } from "@/lib/intelligence/pipeline";
import { getCreditSnapshot } from "@/lib/sectors/server";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/primitives";
import { IconActivity, IconShield, IconUser, IconWallet } from "@/components/ui/icons";
import { AuditList } from "./audit/AuditList";

export default async function AdminOverview() {
  const { t } = await getTranslator();
  const [users, verified, admins, watched, run, credits, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.watchlistItem.count(),
    latestRun().catch(() => null),
    getCreditSnapshot().catch(() => null),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <>
      <PageHeader title={t("admin.overview.title")} description={t("admin.overview.description")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("admin.overview.users")}
          value={users}
          caption={t("admin.overview.usersCaption", { verified, admins })}
          icon={<IconUser />}
        />
        <StatCard
          label={t("admin.overview.watched")}
          value={watched}
          caption={t("admin.overview.watchedCaption")}
          icon={<IconShield />}
        />
        <StatCard
          label={t("admin.overview.run")}
          value={run ? run.status : t("admin.overview.noRun")}
          caption={run ? t("admin.overview.runCaption", { date: run.runDate, spent: run.creditsSpent }) : undefined}
          icon={<IconActivity />}
        />
        <StatCard
          label={t("admin.overview.credits")}
          value={credits ? credits.remaining : "?"}
          caption={credits ? t("admin.overview.creditsCaption", { spent: credits.spent, limit: credits.limit }) : undefined}
          icon={<IconWallet />}
          iconTone="neutral"
        />
      </div>

      <Card>
        <CardHeader
          title={t("admin.overview.recent")}
          aside={
            <Link href="/admin/audit" className="text-sm font-semibold text-accent hover:underline">
              {t("admin.overview.allActivity")}
            </Link>
          }
        />
        <AuditList entries={recent} emptyLabel={t("admin.audit.empty")} />
      </Card>
    </>
  );
}
