import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { en, id as idDict } from "@/lib/i18n/dictionary";
import { EDITABLE_KEYS } from "@/lib/admin/content";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SMALL, INPUT, TEXTAREA } from "@/components/formStyles";
import { revertOverride, saveOverride } from "./actions";

const DEFAULTS = { en, id: idDict } as const;

/**
 * Landing page text, one row per string. Each row opens to an editor for
 * both languages, showing the built-in text it replaces. Saving an empty
 * field is refused; "revert" is how an override is removed.
 */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t } = await getTranslator();
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const overrides = await prisma.contentOverride.findMany();
  const current = new Map(overrides.map((o) => [`${o.key}|${o.locale}`, o.value]));

  const keys = EDITABLE_KEYS.filter(
    (key) =>
      !q ||
      key.toLowerCase().includes(q) ||
      en[key].toLowerCase().includes(q) ||
      idDict[key].toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader
        title={t("admin.content.title")}
        description={t("admin.content.description", { edited: overrides.length })}
      />

      <Card>
        <form className="mb-5 flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">{t("admin.search")}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t("admin.content.searchPlaceholder")} className={INPUT} />
          <button type="submit" className={`${BUTTON_SMALL} h-11 px-5`}>{t("admin.search")}</button>
        </form>

        <ul className="divide-y divide-border">
          {keys.map((key) => {
            const edited = (["en", "id"] as const).filter((l) => current.has(`${key}|${l}`));
            return (
              <li key={key}>
                <details className="group py-3">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                    <span className="min-w-0">
                      <code className="text-[12px] text-text-subtle">{key}</code>
                      <span className="mt-0.5 block truncate text-sm text-text">
                        {current.get(`${key}|en`) ?? en[key]}
                      </span>
                    </span>
                    {edited.length > 0 ? (
                      <Badge tone="accent">{t("admin.content.edited", { langs: edited.join(", ").toUpperCase() })}</Badge>
                    ) : null}
                  </summary>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {(["en", "id"] as const).map((locale) => {
                      const value = current.get(`${key}|${locale}`);
                      return (
                        <div key={locale} className="rounded-[var(--radius-sm)] bg-surface-raised p-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
                            {locale === "en" ? "English" : "Indonesia"}
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            {t("admin.content.default")}: {DEFAULTS[locale][key]}
                          </p>
                          <ActionForm action={saveOverride} className="mt-3 space-y-2">
                            <input type="hidden" name="key" value={key} />
                            <input type="hidden" name="locale" value={locale} />
                            <textarea
                              name="value"
                              aria-label={`${key} ${locale}`}
                              defaultValue={value ?? DEFAULTS[locale][key]}
                              maxLength={600}
                              className={TEXTAREA}
                            />
                            <SubmitButton className={BUTTON_PRIMARY}>{t("account.save")}</SubmitButton>
                          </ActionForm>
                          {value !== undefined ? (
                            <ActionForm action={revertOverride} className="mt-2">
                              <input type="hidden" name="key" value={key} />
                              <input type="hidden" name="locale" value={locale} />
                              <SubmitButton className={BUTTON_SMALL}>{t("admin.content.revert")}</SubmitButton>
                            </ActionForm>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
