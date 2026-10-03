import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { assetUrl } from "@/lib/brand/settings";
import { MAX_UPLOAD_BYTES } from "@/lib/admin/upload";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/Logo";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SMALL, INPUT, LABEL } from "@/components/formStyles";
import { activateAsset, deleteAsset, renameAsset, uploadAsset } from "./actions";

const KINDS = [
  { kind: "LOGO", accept: "image/png,image/jpeg,image/webp,image/svg+xml", title: "admin.assets.logos", hint: "admin.assets.logoHint" },
  { kind: "FAVICON", accept: "image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml", title: "admin.assets.favicons", hint: "admin.assets.faviconHint" },
] as const;

export default async function AssetsPage() {
  const { t } = await getTranslator();
  const assets = await prisma.brandAsset.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, name: true, mimeType: true, size: true, isActive: true },
  });

  return (
    <>
      <PageHeader
        title={t("admin.assets.title")}
        description={t("admin.assets.description", { kb: MAX_UPLOAD_BYTES / 1024 })}
      />

      {KINDS.map(({ kind, accept, title, hint }) => {
        const list = assets.filter((a) => a.kind === kind);
        const builtInActive = !list.some((a) => a.isActive);
        return (
          <Card key={kind}>
            <CardHeader title={t(title as TranslationKey)} description={t(hint as TranslationKey)} />

            <ActionForm action={uploadAsset} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="kind" value={kind} />
              <div>
                <label htmlFor={`file-${kind}`} className={LABEL}>{t("admin.assets.file")}</label>
                <input
                  id={`file-${kind}`}
                  name="file"
                  type="file"
                  required
                  accept={accept}
                  className="block w-full text-sm text-text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-sm file:font-bold file:text-accent"
                />
              </div>
              <div>
                <label htmlFor={`name-${kind}`} className={LABEL}>{t("admin.assets.name")}</label>
                <input id={`name-${kind}`} name="name" maxLength={80} className={INPUT} />
              </div>
              <SubmitButton className={BUTTON_PRIMARY}>{t("admin.assets.upload")}</SubmitButton>
              <label className="flex items-center gap-2.5 text-sm text-text sm:col-span-3">
                <input type="checkbox" name="activate" defaultChecked className="h-[18px] w-[18px] accent-accent-bright" />
                {t("admin.assets.activateNow")}
              </label>
            </ActionForm>

            <ul className="mt-6 space-y-3">
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-surface-raised p-3">
                <div className="flex items-center gap-3">
                  <LogoMark size={40} />
                  <span className="text-sm font-bold text-text">{t("admin.assets.builtIn")}</span>
                  {builtInActive ? <Badge tone="accent">{t("admin.active")}</Badge> : null}
                </div>
                {builtInActive ? null : (
                  <ActionForm action={activateAsset}>
                    <input type="hidden" name="kind" value={kind} />
                    <input type="hidden" name="id" value="builtin" />
                    <SubmitButton className={BUTTON_SECONDARY}>{t("admin.activate")}</SubmitButton>
                  </ActionForm>
                )}
              </li>

              {list.map((a) => (
                <li key={a.id} className="rounded-[var(--radius-sm)] bg-surface-raised p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assetUrl(a.id)}
                        alt={a.name}
                        className="h-10 w-10 shrink-0 rounded-[10px] border border-border bg-surface object-contain"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text">{a.name}</p>
                        <p className="text-xs text-text-subtle">
                          {a.mimeType} · {Math.ceil(a.size / 1024)} KB
                        </p>
                      </div>
                      {a.isActive ? <Badge tone="accent">{t("admin.active")}</Badge> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.isActive ? null : (
                        <ActionForm action={activateAsset}>
                          <input type="hidden" name="kind" value={kind} />
                          <input type="hidden" name="id" value={a.id} />
                          <SubmitButton className={BUTTON_SMALL}>{t("admin.activate")}</SubmitButton>
                        </ActionForm>
                      )}
                      <ActionForm action={deleteAsset} confirm={t("admin.confirmDelete")}>
                        <input type="hidden" name="id" value={a.id} />
                        <SubmitButton className={`${BUTTON_SMALL} text-down`}>{t("admin.delete")}</SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                  <ActionForm action={renameAsset} className="mt-3 flex gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      name="name"
                      aria-label={t("admin.assets.name")}
                      defaultValue={a.name}
                      maxLength={80}
                      className="h-8 w-60 rounded-full border border-border bg-surface px-3 text-xs text-text focus:border-accent focus:outline-none"
                    />
                    <SubmitButton className={BUTTON_SMALL}>{t("admin.rename")}</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </>
  );
}
