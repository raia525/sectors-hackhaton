import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT, LABEL } from "@/components/formStyles";
import { IconChevronLeft } from "@/components/ui/icons";
import { RoleAndLocale } from "../RoleAndLocale";
import { deleteUser, setUserPassword, signOutUser, updateUser } from "../actions";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getTranslator();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { watchlistItems: true, holdings: true, notifications: true } } },
  });
  if (!user) notFound();

  return (
    <>
      <PageHeader
        back={
          <Link
            href="/admin/users"
            aria-label={t("admin.back")}
            className="mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:text-text"
          >
            <IconChevronLeft />
          </Link>
        }
        title={user.name || user.email}
        description={t("admin.users.stats", {
          watch: user._count.watchlistItems,
          holdings: user._count.holdings,
          alerts: user._count.notifications,
          date: user.createdAt.toISOString().slice(0, 10),
        })}
      />

      <Card>
        <CardHeader title={t("admin.users.details")} />
        <ActionForm action={updateUser} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={user.id} />
          <div>
            <label htmlFor="email" className={LABEL}>{t("auth.email")}</label>
            <input id="email" name="email" type="email" required defaultValue={user.email} className={INPUT} />
          </div>
          <div>
            <label htmlFor="name" className={LABEL}>{t("auth.name")}</label>
            <input id="name" name="name" maxLength={100} defaultValue={user.name ?? ""} className={INPUT} />
          </div>
          <RoleAndLocale t={t} role={user.role} locale={user.locale} />
          <label className="flex items-center gap-2.5 text-sm text-text">
            <input type="checkbox" name="verified" defaultChecked={user.emailVerifiedAt !== null} className="h-[18px] w-[18px] accent-accent-bright" />
            {t("account.verified")}
          </label>
          <label className="flex items-center gap-2.5 text-sm text-text">
            <input type="checkbox" name="briefOptIn" defaultChecked={user.briefOptIn} className="h-[18px] w-[18px] accent-accent-bright" />
            {t("watchlist.briefTitle")}
          </label>
          <div className="sm:col-span-2">
            <SubmitButton className={BUTTON_PRIMARY}>{t("account.save")}</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("admin.users.setPassword")} description={t("admin.users.setPasswordHint")} />
          <ActionForm action={setUserPassword} className="space-y-4">
            <input type="hidden" name="id" value={user.id} />
            <input
              aria-label={t("auth.reset.newPasswordLabel")}
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              placeholder={t("auth.reset.newPasswordLabel")}
              className={INPUT}
            />
            <SubmitButton className={BUTTON_PRIMARY}>{t("admin.users.setPassword")}</SubmitButton>
          </ActionForm>
          <ActionForm action={signOutUser} className="mt-6 border-t border-border pt-5">
            <input type="hidden" name="id" value={user.id} />
            <p className="mb-3 text-[13px] text-text-muted">{t("admin.users.signOutHint")}</p>
            <SubmitButton className={BUTTON_SECONDARY}>{t("account.everywhereButton")}</SubmitButton>
          </ActionForm>
        </Card>

        <Card className="border-down/30">
          <CardHeader title={t("admin.users.deleteTitle")} description={t("admin.users.deleteHint")} />
          <ActionForm action={deleteUser} confirm={t("admin.users.deleteConfirm", { email: user.email })}>
            <input type="hidden" name="id" value={user.id} />
            <SubmitButton className={BUTTON_DANGER}>{t("admin.delete")}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
