import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getTranslator } from "@/lib/i18n/server";
import { MAX_BULK } from "@/lib/admin/symbols";
import { listSymbols } from "@/lib/admin/symbol-list";
import { dailyCreditCap } from "@/lib/settings/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SMALL, INPUT, LABEL, TEXTAREA } from "@/components/formStyles";
import { SymbolListEditor } from "../SymbolListEditor";
import { addMostWatched, addStock, importDefaults, removeStock, updateStock } from "./actions";

const STATUS_TONE = { DONE: "normal", SKIPPED: "moderate", FAILED: "extreme", PENDING: "neutral", RUNNING: "neutral" } as const;
const STATUS_KEY = {
  DONE: "admin.universe.status.DONE",
  SKIPPED: "admin.universe.status.SKIPPED",
  FAILED: "admin.universe.status.FAILED",
  PENDING: "admin.universe.status.PENDING",
  RUNNING: "admin.universe.status.RUNNING",
} as const;

export default async function UniversePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ t }, { q = "" }, cap] = await Promise.all([getTranslator(), searchParams, dailyCreditCap()]);
  const env = getEnv();
  const all = await listSymbols("universe");
  const query = q.trim().toUpperCase();

  const [notes, directory, lastItems] = await Promise.all([
    prisma.universeStock.findMany({ select: { symbol: true, note: true } }),
    prisma.companyDirectoryEntry.findMany({
      where: { symbol: { in: all.map((s) => s.symbol) } },
      select: { symbol: true, companyName: true, sector: true },
    }),
    // The latest run result for each stock, so a stock that keeps failing
    // or being skipped by the credit cap is visible here.
    prisma.runItem.findMany({
      where: { symbol: { in: all.map((s) => s.symbol) } },
      orderBy: { run: { runDate: "desc" } },
      distinct: ["symbol"],
      select: { symbol: true, status: true, run: { select: { runDate: true } } },
    }),
  ]);
  const noteBy = new Map(notes.map((n) => [n.symbol, n.note]));
  const dirBy = new Map(directory.map((d) => [d.symbol, d]));
  const lastBy = new Map(lastItems.map((i) => [i.symbol, i]));

  const rows = all.filter((s) => {
    if (!query) return true;
    const name = dirBy.get(s.symbol)?.companyName.toUpperCase() ?? "";
    return s.symbol.includes(query) || name.includes(query);
  });
  const active = all.filter((s) => s.isActive).length;

  return (
    <>
      <PageHeader title={t("admin.universe.title")} description={t("admin.universe.description", { cap })} />

      <Card>
        <p className="text-sm text-text-muted">
          {active > 0
            ? t("admin.universe.usingList", { count: active })
            : t("admin.universe.usingEnv", { list: env.MARKET_UNIVERSE })}
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <ActionForm action={addStock} className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="sm:col-span-1">
              <label htmlFor="universe-symbols" className={LABEL}>
                {t("admin.list.paste", { max: MAX_BULK })}
              </label>
              <textarea id="universe-symbols" name="symbols" required rows={2} placeholder="BBRI, BBCA, TLKM" className={`${TEXTAREA} uppercase`} />
            </div>
            <div>
              <label htmlFor="note" className={LABEL}>{t("admin.universe.note")}</label>
              <input id="note" name="note" maxLength={120} className={INPUT} />
            </div>
            <SubmitButton className={`${BUTTON_PRIMARY} justify-self-start`}>{t("admin.list.add")}</SubmitButton>
          </ActionForm>
          <div className="flex flex-col gap-2 self-end">
            <ActionForm action={addMostWatched}>
              <SubmitButton className={BUTTON_SECONDARY}>{t("admin.universe.addWatched")}</SubmitButton>
            </ActionForm>
            <ActionForm action={importDefaults}>
              <SubmitButton className={BUTTON_SECONDARY}>{t("admin.universe.import")}</SubmitButton>
            </ActionForm>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <CardHeader title={t("admin.list.title")} description={t("admin.universe.listCount", { count: all.length, active })} />
          <form role="search" className="flex gap-2">
            <label htmlFor="uq" className="sr-only">{t("admin.search")}</label>
            <input id="uq" name="q" defaultValue={q} placeholder={t("admin.universe.searchPlaceholder")} className={`${INPUT} h-9 w-56`} />
            <button type="submit" className={BUTTON_SMALL}>{t("admin.search")}</button>
          </form>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">{all.length === 0 ? t("admin.universe.none") : t("admin.noResults")}</p>
        ) : (
          <SymbolListEditor
            rows={rows.map((s) => {
              const last = lastBy.get(s.symbol);
              const dir = dirBy.get(s.symbol);
              return {
                ...s,
                name: dir?.companyName ?? null,
                extra: (
                  <div className="flex flex-wrap items-center gap-2">
                    {dir?.sector ? <span className="text-xs text-text-subtle">{dir.sector}</span> : null}
                    {last ? (
                      <Badge tone={STATUS_TONE[last.status]}>
                        {t("admin.universe.lastRun", { status: t(STATUS_KEY[last.status]), date: last.run.runDate })}
                      </Badge>
                    ) : (
                      <span className="text-xs text-text-subtle">{t("admin.universe.neverRun")}</span>
                    )}
                    <ActionForm action={updateStock} className="flex gap-2">
                      <input type="hidden" name="symbol" value={s.symbol} />
                      <input type="hidden" name="intent" value="note" />
                      <input
                        name="note"
                        aria-label={t("admin.universe.note")}
                        defaultValue={noteBy.get(s.symbol) ?? ""}
                        placeholder={t("admin.universe.note")}
                        maxLength={120}
                        className="h-8 w-48 rounded-full border border-border bg-surface px-3 text-xs text-text focus:border-accent focus:outline-none"
                      />
                      <SubmitButton className={BUTTON_SMALL}>{t("account.save")}</SubmitButton>
                    </ActionForm>
                  </div>
                ),
              };
            })}
            update={updateStock}
            remove={removeStock}
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
    </>
  );
}
