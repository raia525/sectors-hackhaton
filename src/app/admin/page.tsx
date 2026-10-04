import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { latestRun } from "@/lib/intelligence/pipeline";
import { getCreditSnapshot } from "@/lib/sectors/server";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/primitives";
import { IconActivity, IconShield, IconSpark, IconUser, IconWallet } from "@/components/ui/icons";
import { jakartaDayStart } from "@/lib/chat/prompt";
import { getEnv } from "@/lib/env";
import { AuditList } from "./audit/AuditList";

export default async function AdminOverview() {
  const { t } = await getTranslator();
  const today = jakartaDayStart(new Date());
  const [users, verified, admins, watched, run, credits, recent, questions, tokens] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.watchlistItem.count(),
    latestRun().catch(() => null),
    getCreditSnapshot().catch(() => null),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.chatMessage.count({ where: { role: "USER", createdAt: { gte: today } } }),
    prisma.chatMessage.aggregate({
      where: { role: "ASSISTANT", createdAt: { gte: today } },
      _sum: { promptTokens: true, completionTokens: true },
    }),
  ]);
  const tokensToday = (tokens._sum.promptTokens ?? 0) + (tokens._sum.completionTokens ?? 0);

  return (
    <>
      <PageHeader title={t("admin.overview.title")} description={t("admin.overview.description")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <StatCard
          label={t("admin.overview.chat")}
          value={getEnv().XAI_API_KEY ? questions : t("admin.overview.chatOff")}
          caption={t("admin.overview.chatCaption", { tokens: tokensToday.toLocaleString("en-US") })}
          icon={<IconSpark />}
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
