import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { DEFAULT_STRIP, MAX_BULK } from "@/lib/admin/symbols";
import { listSymbols } from "@/lib/admin/symbol-list";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, LABEL, TEXTAREA } from "@/components/formStyles";
import { SymbolListEditor } from "../SymbolListEditor";
import { SettingCheck, SettingsGroup } from "../settings/SettingsGroup";
import { getAppSettings } from "@/lib/settings/server";
import {
  addStripSymbols,
  fillSectors,
  removeStripSymbol,
  resetStrip,
  syncDirectory,
  updateStripSymbol,
} from "./actions";

/** The landing page ticker strip, and the directory every ticker list reads. */
export default async function TickerStripPage() {
  const [{ t }, { strip }] = await Promise.all([getTranslator(), getAppSettings()]);
  const [rows, directory, withSector, lastSync] = await Promise.all([
    listSymbols("strip"),
    prisma.companyDirectoryEntry.count(),
    prisma.companyDirectoryEntry.count({ where: { sector: { not: null } } }),
    prisma.companyDirectoryEntry.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  const names = new Map(
    (
      await prisma.companyDirectoryEntry.findMany({
        where: { symbol: { in: rows.map((r) => r.symbol) } },
        select: { symbol: true, companyName: true },
      })
    ).map((c) => [c.symbol, c.companyName]),
  );
  const active = rows.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader title={t("admin.strip.title")} description={t("admin.strip.description")} />

      <Card>
        <p className="text-sm text-text-muted">
          {active > 0 ? t("admin.strip.usingList", { count: active }) : t("admin.strip.usingDefault", { count: DEFAULT_STRIP.length })}
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <ActionForm action={addStripSymbols} className="space-y-3">
            <label htmlFor="strip-symbols" className={LABEL}>
              {t("admin.list.paste", { max: MAX_BULK })}
            </label>
            <textarea id="strip-symbols" name="symbols" required rows={2} placeholder="BBCA, BBRI, TLKM" className={`${TEXTAREA} uppercase`} />
            <SubmitButton className={BUTTON_PRIMARY}>{t("admin.list.add")}</SubmitButton>
          </ActionForm>
          <ActionForm action={resetStrip} confirm={t("admin.strip.confirmReset")} className="self-end">
            <SubmitButton className={BUTTON_SECONDARY}>{t("admin.strip.resetButton")}</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-xs text-text-subtle">{t("admin.strip.settingsHint")}</p>
      </Card>

      <SettingsGroup
        group="strip"
        title={t("admin.settings.strip.title")}
        description={t("admin.settings.strip.description")}
        resetLabel={t("admin.settings.reset")}
        saveLabel={t("account.save")}
      >
        <fieldset>
          <legend className={LABEL}>{t("admin.settings.strip.speed")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["slow", "normal", "fast"] as const).map((speed) => (
              <label key={speed} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="speed" value={speed} defaultChecked={strip.speed === speed} className="accent-accent-bright" />
                {t(`admin.settings.strip.speed.${speed}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <SettingCheck name="showNames" label={t("admin.settings.strip.names")} checked={strip.showNames} />
        <SettingCheck name="showMove" label={t("admin.settings.strip.move")} checked={strip.showMove} hint={t("admin.settings.strip.moveHint")} />
      </SettingsGroup>

      <Card>
        <CardHeader title={t("admin.list.title")} />
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">{t("admin.strip.none")}</p>
        ) : (
          <SymbolListEditor
            rows={rows.map((r) => ({ ...r, name: names.get(r.symbol) ?? null }))}
            update={updateStripSymbol}
            remove={removeStripSymbol}
            labels={{
              up: t("admin.moveUp"),
              down: t("admin.moveDown"),
              pause: t("admin.universe.pause"),
              resume: t("admin.universe.resume"),
              paused: t("admin.universe.paused"),
              moveTo: t("admin.list.moveTo"),
              move: t("admin.list.move"),
              remove: t("admin.delete"),
              confirmRemove: t("admin.confirmDelete"),
              position: t("admin.list.position"),
            }}
          />
        )}
      </Card>

      <Card>
        <CardHeader title={t("admin.directory.title")} description={t("admin.directory.description")} />
        <p className="text-sm text-text">
          {t("admin.directory.status", {
            count: directory,
            sectors: withSector,
            date: lastSync ? lastSync.updatedAt.toISOString().slice(0, 10) : "-",
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ActionForm action={syncDirectory} confirm={t("admin.directory.confirmSync")}>
            <SubmitButton className={BUTTON_PRIMARY}>{t("admin.directory.sync")}</SubmitButton>
          </ActionForm>
          <ActionForm action={fillSectors}>
            <SubmitButton className={BUTTON_SECONDARY}>{t("admin.directory.fillSectors")}</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </>
  );
}
