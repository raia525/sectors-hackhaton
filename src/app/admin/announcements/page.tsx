import type { Announcement } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { formatWib, scheduleStatus } from "@/lib/admin/schedule";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, type BadgeTone, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_DANGER, BUTTON_PRIMARY, INPUT, LABEL, TEXTAREA } from "@/components/formStyles";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "./actions";

const STATUS_TONE: Record<ReturnType<typeof scheduleStatus>, BadgeTone> = {
  live: "accent",
  scheduled: "moderate",
  ended: "neutral",
  off: "neutral",
};

export default async function AnnouncementsPage() {
  const { t } = await getTranslator();
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();

  return (
    <>
      <PageHeader title={t("admin.announcements.title")} description={t("admin.announcements.description")} />

      <Card>
        <details open={announcements.length === 0}>
          <summary className="cursor-pointer text-[15px] font-bold text-text">{t("admin.announcements.new")}</summary>
          <ActionForm action={createAnnouncement} className="mt-5">
            <AnnouncementFields t={t} />
            <SubmitButton className={`${BUTTON_PRIMARY} mt-4`}>{t("admin.create")}</SubmitButton>
          </ActionForm>
        </details>
      </Card>

      <Card>
        <CardHeader title={t("admin.announcements.list")} />
        {announcements.length === 0 ? (
          <p className="text-sm text-text-muted">{t("admin.announcements.none")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {announcements.map((a) => {
              const status = scheduleStatus(a, now);
              return (
                <li key={a.id}>
                  <details className="py-3">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <span className="min-w-0 text-sm text-text">{a.messageEn}</span>
                      <Badge tone={STATUS_TONE[status]}>{t(`admin.announcements.status.${status}` as TranslationKey)}</Badge>
                    </summary>
                    <ActionForm action={updateAnnouncement} className="mt-4">
                      <input type="hidden" name="id" value={a.id} />
                      <AnnouncementFields t={t} value={a} />
                      <SubmitButton className={`${BUTTON_PRIMARY} mt-4`}>{t("account.save")}</SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteAnnouncement} confirm={t("admin.confirmDelete")} className="mt-3">
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton className={BUTTON_DANGER}>{t("admin.delete")}</SubmitButton>
                    </ActionForm>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

/** The fields shared by the create and edit forms. */
function AnnouncementFields({ t, value }: { t: (key: TranslationKey) => string; value?: Announcement }) {
  const idFor = (name: string) => `${name}-${value?.id ?? "new"}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={idFor("messageEn")} className={LABEL}>{t("admin.announcements.messageEn")}</label>
        <textarea id={idFor("messageEn")} name="messageEn" required maxLength={280} defaultValue={value?.messageEn} className={TEXTAREA} />
      </div>
      <div>
        <label htmlFor={idFor("messageId")} className={LABEL}>{t("admin.announcements.messageId")}</label>
        <textarea id={idFor("messageId")} name="messageId" required maxLength={280} defaultValue={value?.messageId} className={TEXTAREA} />
      </div>
      <div>
        <label htmlFor={idFor("tone")} className={LABEL}>{t("admin.announcements.tone")}</label>
        <select id={idFor("tone")} name="tone" defaultValue={value?.tone ?? "INFO"} className={INPUT}>
          <option value="INFO">{t("admin.announcements.toneInfo")}</option>
          <option value="WARNING">{t("admin.announcements.toneWarning")}</option>
          <option value="SUCCESS">{t("admin.announcements.toneSuccess")}</option>
        </select>
      </div>
      <div>
        <label htmlFor={idFor("audience")} className={LABEL}>{t("admin.announcements.audience")}</label>
        <select id={idFor("audience")} name="audience" defaultValue={value?.audience ?? "ALL"} className={INPUT}>
          <option value="ALL">{t("admin.announcements.audienceAll")}</option>
          <option value="SIGNED_IN">{t("admin.announcements.audienceSignedIn")}</option>
          <option value="GUESTS">{t("admin.announcements.audienceGuests")}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={idFor("linkUrl")} className={LABEL}>{t("admin.announcements.link")}</label>
        <input id={idFor("linkUrl")} name="linkUrl" defaultValue={value?.linkUrl ?? ""} placeholder="/brief" className={INPUT} />
      </div>
      <div>
        <label htmlFor={idFor("linkLabelEn")} className={LABEL}>{t("admin.announcements.linkLabelEn")}</label>
        <input id={idFor("linkLabelEn")} name="linkLabelEn" maxLength={60} defaultValue={value?.linkLabelEn ?? ""} className={INPUT} />
      </div>
      <div>
        <label htmlFor={idFor("linkLabelId")} className={LABEL}>{t("admin.announcements.linkLabelId")}</label>
        <input id={idFor("linkLabelId")} name="linkLabelId" maxLength={60} defaultValue={value?.linkLabelId ?? ""} className={INPUT} />
      </div>
      <div>
        <label htmlFor={idFor("startsAt")} className={LABEL}>{t("admin.announcements.startsAt")}</label>
        <input id={idFor("startsAt")} name="startsAt" type="datetime-local" defaultValue={formatWib(value?.startsAt ?? null)} className={INPUT} />
      </div>
      <div>
        <label htmlFor={idFor("endsAt")} className={LABEL}>{t("admin.announcements.endsAt")}</label>
        <input id={idFor("endsAt")} name="endsAt" type="datetime-local" defaultValue={formatWib(value?.endsAt ?? null)} className={INPUT} />
      </div>
      <label className="flex items-center gap-2.5 text-sm text-text sm:col-span-2">
        <input type="checkbox" name="isActive" defaultChecked={value?.isActive ?? true} className="h-[18px] w-[18px] accent-accent-bright" />
        {t("admin.announcements.active")}
      </label>
    </div>
  );
}
