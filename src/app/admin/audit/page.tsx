import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { Card, PageHeader } from "@/components/ui/primitives";
import { BUTTON_SMALL } from "@/components/formStyles";
import { AuditList } from "./AuditList";

const PAGE_SIZE = 30;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { t } = await getTranslator();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [entries, total] = await Promise.all([
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.adminAuditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title={t("admin.audit.title")} description={t("admin.audit.description")} />
      <Card>
        <AuditList entries={entries} emptyLabel={t("admin.audit.empty")} />
        {pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
            <span>{t("admin.pageOf", { page, pages })}</span>
            <span className="flex gap-2">
              {page > 1 ? <Link className={BUTTON_SMALL} href={`/admin/audit?page=${page - 1}`}>{t("admin.prev")}</Link> : null}
              {page < pages ? <Link className={BUTTON_SMALL} href={`/admin/audit?page=${page + 1}`}>{t("admin.next")}</Link> : null}
            </span>
          </div>
        ) : null}
      </Card>
    </>
  );
}
