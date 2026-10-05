import Link from "next/link";
import { redirect } from "next/navigation";
import type { NotificationKind } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { NotificationList } from "@/components/NotificationList";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { InkPanel, PageHeader } from "@/components/ui/primitives";
import { BUTTON_SECONDARY, BUTTON_SMALL, INPUT, LABEL } from "@/components/formStyles";
import { markAlertsRead } from "../actions";

export const metadata = { title: "Alerts | SHADOW IDX" };

const KINDS = ["DIVERGENCE", "CORPORATE_ACTION", "SMART_MONEY", "RULE"] as const satisfies readonly NotificationKind[];
const KIND_KEY = {
  DIVERGENCE: "watchlist.kind.divergence",
  CORPORATE_ACTION: "watchlist.kind.corporateAction",
  SMART_MONEY: "watchlist.kind.smartMoney",
  RULE: "watchlist.kind.rule",
} as const;

/**
 * Alerts the daily run has sent this user, newest first, filterable by
 * stock and type, with "mark as read" for one or all. Reading stays an
 * explicit choice: opening the page does not change anything.
 */
export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; kind?: string; unread?: string }>;
}) {
  const [user, { t }, params] = await Promise.all([getCurrentUser(), getTranslator(), searchParams]);
  if (!user) redirect("/signin?next=/portfolio/alerts");

  const symbol = /^[A-Z]{4}$/.test(params.symbol ?? "") ? params.symbol : undefined;
  const kind = KINDS.find((k) => k === params.kind);
  const unreadOnly = params.unread === "1";

  const [notifications, symbols, watched, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, ...(symbol ? { symbol } : {}), ...(kind ? { kind } : {}), ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      distinct: ["symbol"],
      select: { symbol: true },
      orderBy: { symbol: "asc" },
    }),
    prisma.watchlistItem.findMany({ where: { userId: user.id }, select: { symbol: true } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const watchedSet = new Set(watched.map((w) => w.symbol));
  const filtered = Boolean(symbol || kind || unreadOnly);

  return (
    <>
      <PageHeader
        title={t("watchlist.alertsTitle")}
        description={t("watchlist.alertsDescription")}
        actions={
          unread > 0 ? (
            <ActionForm action={markAlertsRead}>
              <SubmitButton className={BUTTON_SECONDARY}>{t("alerts.markAll", { count: unread })}</SubmitButton>
            </ActionForm>
          ) : null
        }
      />

      <form role="search" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="alert-symbol" className={LABEL}>{t("alerts.filterStock")}</label>
          <select id="alert-symbol" name="symbol" defaultValue={symbol ?? ""} className={INPUT}>
            <option value="">{t("alerts.allStocks")}</option>
            {symbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="alert-kind" className={LABEL}>{t("alerts.filterKind")}</label>
          <select id="alert-kind" name="kind" defaultValue={kind ?? ""} className={INPUT}>
            <option value="">{t("alerts.allKinds")}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>{t(KIND_KEY[k])}</option>
            ))}
          </select>
        </div>
        <label className="flex h-11 items-center gap-2 text-sm text-text">
          <input type="checkbox" name="unread" value="1" defaultChecked={unreadOnly} className="h-4 w-4 accent-accent-bright" />
          {t("alerts.unreadOnly")}
        </label>
        <div className="flex gap-2">
          <button type="submit" className={`${BUTTON_SMALL} h-11 px-5`}>{t("list.apply")}</button>
          {filtered ? (
            <Link href="/portfolio/alerts" className={`${BUTTON_SMALL} flex h-11 items-center px-5`}>{t("alerts.clear")}</Link>
          ) : null}
        </div>
      </form>

      <InkPanel>
        {filtered && notifications.length === 0 ? (
          <p className="text-sm text-text-muted">{t("alerts.noMatch")}</p>
        ) : (
          <NotificationList
            notifications={notifications.map((n) => ({
              id: n.id,
              symbol: n.symbol,
              kind: n.kind,
              title: n.title,
              body: n.body,
              createdAt: n.createdAt.toISOString(),
              read: n.readAt !== null,
              watched: watchedSet.has(n.symbol),
            }))}
          />
        )}
      </InkPanel>
    </>
  );
}
