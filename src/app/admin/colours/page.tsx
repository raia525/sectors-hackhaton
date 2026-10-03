import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import {
  contrastRatio,
  DEFAULT_PALETTE,
  MIN_BUTTON_CONTRAST,
  PALETTE_FIELDS,
  type PaletteColours,
  type PaletteField,
} from "@/lib/admin/palette";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT, LABEL } from "@/components/formStyles";
import { activatePalette, createPalette, deletePalette, updatePalette } from "./actions";

const FIELD_LABEL: Record<PaletteField, TranslationKey> = {
  lightAccent: "admin.colours.field.accent",
  lightAccentHover: "admin.colours.field.hover",
  lightAccentBright: "admin.colours.field.bright",
  lightAccentSoft: "admin.colours.field.soft",
  darkAccent: "admin.colours.field.accent",
  darkAccentHover: "admin.colours.field.hover",
  darkAccentBright: "admin.colours.field.bright",
  darkAccentSoft: "admin.colours.field.soft",
};

export default async function ColoursPage() {
  const { t } = await getTranslator();
  const palettes = await prisma.brandPalette.findMany({ orderBy: { createdAt: "asc" } });
  const builtInActive = !palettes.some((p) => p.isActive);

  return (
    <>
      <PageHeader title={t("admin.colours.title")} description={t("admin.colours.description")} />

      <Card>
        <details>
          <summary className="cursor-pointer text-[15px] font-bold text-text">{t("admin.colours.new")}</summary>
          <ActionForm action={createPalette} className="mt-5">
            <PaletteFields t={t} name="" colours={DEFAULT_PALETTE} idSuffix="new" />
            <SubmitButton className={`${BUTTON_PRIMARY} mt-4`}>{t("admin.create")}</SubmitButton>
          </ActionForm>
        </details>
      </Card>

      <Card>
        <CardHeader title={t("admin.colours.list")} />
        <ul className="space-y-3">
          <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-surface-raised p-4">
            <PaletteSummary name={t("admin.colours.builtIn")} colours={DEFAULT_PALETTE} active={builtInActive} t={t} />
            {builtInActive ? null : (
              <ActionForm action={activatePalette}>
                <input type="hidden" name="id" value="builtin" />
                <SubmitButton className={BUTTON_SECONDARY}>{t("admin.activate")}</SubmitButton>
              </ActionForm>
            )}
          </li>

          {palettes.map((p) => (
            <li key={p.id} className="rounded-[var(--radius-sm)] bg-surface-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PaletteSummary name={p.name} colours={p} active={p.isActive} t={t} />
                {p.isActive ? null : (
                  <ActionForm action={activatePalette}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className={BUTTON_SECONDARY}>{t("admin.activate")}</SubmitButton>
                  </ActionForm>
                )}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-accent">{t("admin.edit")}</summary>
                <ActionForm action={updatePalette} className="mt-4">
                  <input type="hidden" name="id" value={p.id} />
                  <PaletteFields t={t} name={p.name} colours={p} idSuffix={p.id} />
                  <SubmitButton className={`${BUTTON_PRIMARY} mt-4`}>{t("account.save")}</SubmitButton>
                </ActionForm>
                {p.isActive ? (
                  <p className="mt-3 text-xs text-text-subtle">{t("admin.colours.deleteActive")}</p>
                ) : (
                  <ActionForm action={deletePalette} confirm={t("admin.confirmDelete")} className="mt-3">
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className={BUTTON_DANGER}>{t("admin.delete")}</SubmitButton>
                  </ActionForm>
                )}
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function PaletteSummary({
  name,
  colours,
  active,
  t,
}: {
  name: string;
  colours: PaletteColours;
  active: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const lowContrast = [colours.lightAccentBright, colours.darkAccentBright].some(
    (c) => contrastRatio("#ffffff", c) < MIN_BUTTON_CONTRAST,
  );
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-text">
        {name}
        {active ? <Badge tone="accent">{t("admin.active")}</Badge> : null}
        {lowContrast ? <Badge tone="moderate">{t("admin.colours.lowContrast")}</Badge> : null}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {PALETTE_FIELDS.map((field) => (
          <span
            key={field}
            title={field}
            className="h-6 w-6 rounded-full border border-border"
            style={{ backgroundColor: colours[field] }}
          />
        ))}
      </div>
    </div>
  );
}

/** Name plus four colours for each theme, as colour pickers. */
function PaletteFields({
  t,
  name,
  colours,
  idSuffix,
}: {
  t: (key: TranslationKey) => string;
  name: string;
  colours: PaletteColours;
  idSuffix: string;
}) {
  return (
    <div className="space-y-5">
      <div className="max-w-sm">
        <label htmlFor={`name-${idSuffix}`} className={LABEL}>{t("admin.colours.name")}</label>
        <input id={`name-${idSuffix}`} name="name" required maxLength={60} defaultValue={name} className={INPUT} />
      </div>
      {(["light", "dark"] as const).map((theme) => (
        <fieldset key={theme}>
          <legend className="mb-2 text-[12px] font-bold uppercase tracking-wider text-text-subtle">
            {theme === "light" ? t("admin.colours.light") : t("admin.colours.dark")}
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PALETTE_FIELDS.filter((f) => f.startsWith(theme)).map((field) => (
              <label key={field} className="flex items-center gap-2.5 text-[13px] text-text-muted">
                <input
                  type="color"
                  name={field}
                  defaultValue={colours[field]}
                  className="h-10 w-12 cursor-pointer rounded-[10px] border border-border bg-surface"
                />
                {t(FIELD_LABEL[field])}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
