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
  updateLayout,
  updatePreferences,
  updateProfile,
} from "./actions";
import { ANALYSIS_PANELS, HOME_TABS, parsePreferences, type AnalysisPanel } from "@/lib/settings/user";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { I18nExtension } from "@/lib/i18n/client";
import { adminEn, adminId } from "@/lib/i18n/admin-dictionary";

/**
 * The only role strings this page can need, sent to an admin's browser and
 * to no one else's (the "last admin" refusal is shown by a client form).
 */
const ROLE_KEYS = ["account.roleAdmin", "account.error.lastAdmin"] as const;
const roleMessages = {
  en: Object.fromEntries(ROLE_KEYS.map((k) => [k, adminEn[k]])),
  id: Object.fromEntries(ROLE_KEYS.map((k) => [k, adminId[k]])),
};

const PANEL_LABEL: Record<AnalysisPanel, TranslationKey> = {
  keyStats: "analysis.keyStatsTitle",
  corporateActions: "analysis.actionsTitle",
  seasonality: "analysis.seasonalityTitle",
  smartMoney: "analysis.smartMoneyTitle",
};

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
      preferences: true,
    },
  });
  const prefs = parsePreferences(user.preferences);
  const memberSince = user.createdAt.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const content = (
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

        <Card className="scroll-mt-24 lg:col-span-2" id="layout">
          <CardHeader title={t("account.layoutTitle")} description={t("account.layoutDescription")} />
          <ActionForm action={updateLayout} className="space-y-6">
            <fieldset>
              <legend className={LABEL}>{t("account.layoutPanels")}</legend>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ANALYSIS_PANELS.map((panel, i) => {
                  const position = prefs.panels.indexOf(panel);
                  return (
                    <li key={panel} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-surface-raised px-4 py-3">
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-text">
                        <input type="checkbox" name={`show_${panel}`} defaultChecked={position >= 0} className="h-[18px] w-[18px] accent-accent-bright" />
                        {t(PANEL_LABEL[panel])}
                      </label>
                      <label className="flex items-center gap-2 text-xs text-text-subtle">
                        {t("account.layoutPosition")}
                        <select
                          name={`order_${panel}`}
                          defaultValue={String(position >= 0 ? position + 1 : i + 1)}
                          className="h-8 rounded-full border border-border bg-surface px-2 text-sm text-text"
                        >
                          {ANALYSIS_PANELS.map((_, n) => (
                            <option key={n} value={n + 1}>{n + 1}</option>
                          ))}
                        </select>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset>
                <legend className={LABEL}>{t("account.layoutHome")}</legend>
                <div className="flex flex-wrap gap-2">
                  {HOME_TABS.map((tab) => (
                    <label key={tab} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                      <input type="radio" name="homeTab" value={tab} defaultChecked={prefs.homeTab === tab} className="accent-accent-bright" />
                      {t(`nav.${tab}` as TranslationKey)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="defaultThreshold" className={LABEL}>{t("account.layoutThreshold")}</label>
                <input
                  id="defaultThreshold"
                  name="defaultThreshold"
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={prefs.defaultThreshold}
                  className={INPUT}
                />
                <p className="mt-1.5 text-xs text-text-subtle">{t("account.layoutThresholdHint")}</p>
              </div>
            </div>
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

  return user.role === "ADMIN" ? <I18nExtension messages={roleMessages}>{content}</I18nExtension> : content;
}
