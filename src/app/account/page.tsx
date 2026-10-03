import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";
import { signOut } from "@/app/signin/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, Container, PageHeader } from "@/components/ui/primitives";
import {
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  INPUT,
  LABEL,
} from "@/components/formStyles";
import {
  changePassword,
  deleteAccount,
  signOutEverywhere,
  updatePreferences,
  updateProfile,
} from "./actions";

export const metadata = { title: "Account | SHADOW IDX" };
export const dynamic = "force-dynamic";

/**
 * The signed-in user's own account: profile, preferences, security, and
 * deleting the account. Reached from the account menu in the header.
 */
export default async function AccountPage() {
  const [session, { t, locale }] = await Promise.all([getCurrentUser(), getTranslator()]);
  if (!session) redirect("/signin?next=/account");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      createdAt: true,
      emailVerifiedAt: true,
      briefOptIn: true,
      role: true,
    },
  });
  const memberSince = user.createdAt.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Container className="space-y-6 py-8 lg:py-10">
      <PageHeader
        title={t("account.title")}
        description={t("account.description")}
        actions={
          <form action={signOut}>
            <button type="submit" className={BUTTON_SECONDARY}>
              {t("nav.signOut")}
            </button>
          </form>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("account.profileTitle")} description={t("account.profileDescription")} />
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text">{user.email}</span>
            <Badge tone={user.emailVerifiedAt ? "normal" : "moderate"}>
              {user.emailVerifiedAt ? t("account.verified") : t("account.unverified")}
            </Badge>
            {user.role === "ADMIN" ? <Badge tone="accent">{t("account.roleAdmin")}</Badge> : null}
          </div>
          <ActionForm action={updateProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className={LABEL}>{t("account.name")}</label>
              <input id="name" name="name" defaultValue={user.name ?? ""} maxLength={100} autoComplete="name" className={INPUT} />
            </div>
            <SubmitButton className={BUTTON_PRIMARY}>{t("account.save")}</SubmitButton>
          </ActionForm>
          <p className="mt-5 text-xs text-text-subtle">{t("account.memberSince", { date: memberSince })}</p>
          <p className="mt-1 text-xs text-text-subtle">{t("account.emailFixed")}</p>
        </Card>

        <Card>
          <CardHeader title={t("account.preferencesTitle")} description={t("account.preferencesDescription")} />
          <ActionForm action={updatePreferences} className="space-y-5">
            <fieldset>
              <legend className={LABEL}>{t("language.label")}</legend>
              <div className="flex gap-2">
                {LOCALES.map((code) => (
                  <label key={code} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                    <input type="radio" name="locale" value={code} defaultChecked={locale === code} className="accent-accent-bright" />
                    {LOCALE_LABELS[code]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-text">
              <input type="checkbox" name="briefOptIn" defaultChecked={user.briefOptIn} className="mt-0.5 h-[18px] w-[18px] accent-accent-bright" />
              <span>
                <span className="font-semibold">{t("watchlist.briefTitle")}</span>
                <span className="mt-0.5 block text-[13px] text-text-muted">{t("watchlist.briefDescription")}</span>
              </span>
            </label>
            <SubmitButton className={BUTTON_PRIMARY}>{t("account.save")}</SubmitButton>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title={t("account.securityTitle")} description={t("account.securityDescription")} />
          <ActionForm action={changePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className={LABEL}>{t("account.currentPassword")}</label>
              <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={INPUT} />
            </div>
            <div>
              <label htmlFor="newPassword" className={LABEL}>{t("auth.reset.newPasswordLabel")}</label>
              <input id="newPassword" name="newPassword" type="password" required minLength={10} autoComplete="new-password" className={INPUT} />
              <p className="mt-1.5 text-xs text-text-subtle">{t("auth.passwordHint")}</p>
            </div>
            <SubmitButton className={BUTTON_PRIMARY}>{t("account.changePassword")}</SubmitButton>
          </ActionForm>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-semibold text-text">{t("account.everywhereTitle")}</p>
            <p className="mt-1 text-[13px] text-text-muted">{t("account.everywhereBody")}</p>
            <form action={signOutEverywhere} className="mt-3">
              <button type="submit" className={BUTTON_SECONDARY}>{t("account.everywhereButton")}</button>
            </form>
          </div>
        </Card>

        <Card className="border-down/30">
          <CardHeader title={t("account.dangerTitle")} description={t("account.dangerDescription")} />
          <ActionForm action={deleteAccount} confirm={t("account.deleteConfirm")} className="space-y-4">
            <div>
              <label htmlFor="deletePassword" className={LABEL}>{t("account.confirmWithPassword")}</label>
              <input id="deletePassword" name="password" type="password" required autoComplete="current-password" className={INPUT} />
            </div>
            <SubmitButton className={BUTTON_DANGER}>{t("account.deleteButton")}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </Container>
  );
}
