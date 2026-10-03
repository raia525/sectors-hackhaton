import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SMALL, INPUT, LABEL } from "@/components/formStyles";
import { RoleAndLocale } from "./RoleAndLocale";
import { createUser } from "./actions";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
        _count: { select: { watchlistItems: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title={t("admin.users.title")} description={t("admin.users.description", { count: total })} />

      <Card>
        <details>
          <summary className="cursor-pointer text-[15px] font-bold text-text">{t("admin.users.new")}</summary>
          <ActionForm action={createUser} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-email" className={LABEL}>{t("auth.email")}</label>
              <input id="new-email" name="email" type="email" required className={INPUT} />
            </div>
            <div>
              <label htmlFor="new-name" className={LABEL}>{t("auth.name")}</label>
              <input id="new-name" name="name" maxLength={100} className={INPUT} />
            </div>
            <div>
              <label htmlFor="new-password" className={LABEL}>{t("auth.password")}</label>
              <input id="new-password" name="password" type="password" required minLength={10} autoComplete="new-password" className={INPUT} />
            </div>
            <RoleAndLocale t={t} />
            <label className="flex items-center gap-2.5 text-sm text-text sm:col-span-2">
              <input type="checkbox" name="verified" className="h-[18px] w-[18px] accent-accent-bright" />
              {t("admin.users.markVerified")}
            </label>
            <div className="sm:col-span-2">
              <SubmitButton className={BUTTON_PRIMARY}>{t("admin.users.create")}</SubmitButton>
            </div>
          </ActionForm>
        </details>
      </Card>

      <Card>
        <CardHeader title={t("admin.users.list")} />
        <form className="mb-4 flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">{t("admin.search")}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t("admin.users.searchPlaceholder")} className={INPUT} />
          <button type="submit" className={`${BUTTON_SMALL} h-11 px-5`}>{t("admin.search")}</button>
        </form>

        {users.length === 0 ? (
          <p className="text-sm text-text-muted">{t("admin.users.none")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text">{u.name || u.email}</p>
                  <p className="truncate text-xs text-text-muted">
                    {u.name ? `${u.email} · ` : ""}
                    {t("admin.users.watchCount", { count: u._count.watchlistItems })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {u.role === "ADMIN" ? <Badge tone="accent">{t("account.roleAdmin")}</Badge> : null}
                  <Badge tone={u.emailVerifiedAt ? "normal" : "moderate"}>
                    {u.emailVerifiedAt ? t("account.verified") : t("account.unverified")}
                  </Badge>
                  <Link href={`/admin/users/${u.id}`} className={BUTTON_SMALL}>{t("admin.edit")}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
            <span>{t("admin.pageOf", { page, pages })}</span>
            <span className="flex gap-2">
              {page > 1 ? <Link className={BUTTON_SMALL} href={pageHref(page - 1)}>{t("admin.prev")}</Link> : null}
              {page < pages ? <Link className={BUTTON_SMALL} href={pageHref(page + 1)}>{t("admin.next")}</Link> : null}
            </span>
          </div>
        ) : null}
      </Card>
    </>
  );
}
