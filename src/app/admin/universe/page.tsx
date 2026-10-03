import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getTranslator } from "@/lib/i18n/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SMALL, INPUT, LABEL } from "@/components/formStyles";
import { addStock, importDefaults, removeStock, updateStock } from "./actions";

export default async function UniversePage() {
  const { t } = await getTranslator();
  const env = getEnv();
  const stocks = await prisma.universeStock.findMany({ orderBy: { position: "asc" } });
  const names = new Map(
    (
      await prisma.companyDirectoryEntry.findMany({
        where: { symbol: { in: stocks.map((s) => s.symbol) } },
        select: { symbol: true, companyName: true },
      })
    ).map((c) => [c.symbol, c.companyName]),
  );
  const active = stocks.filter((s) => s.isActive).length;

  return (
    <>
      <PageHeader
        title={t("admin.universe.title")}
        description={t("admin.universe.description", { cap: env.AUTOMATION_DAILY_CREDIT_CAP })}
      />

      <Card>
        <p className="text-sm text-text-muted">
          {active > 0
            ? t("admin.universe.usingList", { count: active })
            : t("admin.universe.usingEnv", { list: env.MARKET_UNIVERSE })}
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <ActionForm action={addStock} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="symbol" className={LABEL}>{t("admin.universe.symbol")}</label>
              <input id="symbol" name="symbol" required maxLength={7} placeholder="BBRI" className={`${INPUT} uppercase`} />
            </div>
            <div>
              <label htmlFor="note" className={LABEL}>{t("admin.universe.note")}</label>
              <input id="note" name="note" maxLength={120} className={INPUT} />
            </div>
            <SubmitButton className={BUTTON_PRIMARY}>{t("admin.universe.add")}</SubmitButton>
          </ActionForm>
          {stocks.length === 0 ? (
            <ActionForm action={importDefaults} className="self-end">
              <SubmitButton className={BUTTON_SECONDARY}>{t("admin.universe.import")}</SubmitButton>
            </ActionForm>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("admin.universe.list")} />
        {stocks.length === 0 ? (
          <p className="text-sm text-text-muted">{t("admin.universe.none")}</p>
        ) : (
          <ol className="divide-y divide-border">
            {stocks.map((s, i) => (
              <li key={s.symbol} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text">
                    <span className="tnum mr-2 text-text-subtle">{i + 1}.</span>
                    {s.symbol}
                    <span className="ml-2 font-normal text-text-muted">{names.get(s.symbol) ?? ""}</span>
                  </p>
                  <ActionForm action={updateStock} className="mt-1.5 flex gap-2">
                    <input type="hidden" name="symbol" value={s.symbol} />
                    <input type="hidden" name="intent" value="note" />
                    <input
                      name="note"
                      aria-label={t("admin.universe.note")}
                      defaultValue={s.note ?? ""}
                      placeholder={t("admin.universe.note")}
                      maxLength={120}
                      className="h-8 w-56 rounded-full border border-border bg-surface px-3 text-xs text-text focus:border-accent focus:outline-none"
                    />
                    <SubmitButton className={BUTTON_SMALL}>{t("account.save")}</SubmitButton>
                  </ActionForm>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.isActive ? null : <Badge tone="neutral">{t("admin.universe.paused")}</Badge>}
                  {(["up", "down", "toggle"] as const).map((intent) => (
                    <ActionForm key={intent} action={updateStock}>
                      <input type="hidden" name="symbol" value={s.symbol} />
                      <input type="hidden" name="intent" value={intent} />
                      <SubmitButton className={BUTTON_SMALL}>
                        {intent === "up"
                          ? t("admin.moveUp")
                          : intent === "down"
                            ? t("admin.moveDown")
                            : s.isActive
                              ? t("admin.universe.pause")
                              : t("admin.universe.resume")}
                      </SubmitButton>
                    </ActionForm>
                  ))}
                  <ActionForm action={removeStock} confirm={t("admin.confirmDelete")}>
                    <input type="hidden" name="symbol" value={s.symbol} />
                    <SubmitButton className={`${BUTTON_SMALL} text-down`}>{t("admin.delete")}</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
