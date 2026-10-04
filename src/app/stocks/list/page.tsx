import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { isSignal } from "@/lib/intelligence/track-record";
import { getSignalBars } from "@/lib/settings/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { BUTTON_SMALL, INPUT, LABEL } from "@/components/formStyles";
import { watchFromList } from "./actions";

export const metadata = { title: "Ticker list | SHADOW IDX" };

const PAGE_SIZE = 50;
const SORTS = ["symbol", "name"] as const;
const SHOW = ["all", "watched", "universe", "analysed"] as const;

/**
 * Every IDX ticker in the synced directory, searchable and filterable, with
 * what the app already knows about each: on your watchlist, in the daily
 * run, and its latest stored signal. Reads the database only.
 *
 * The sector filter says how many tickers have a known sector, because
 * sectors are learnt from analyses rather than fetched for all ~950
 * companies, and a filter that silently hides the rest would mislead.
 */
export default async function TickerListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; sort?: string; show?: string; page?: string }>;
}) {
  const [{ t }, params, user, bars] = await Promise.all([getTranslator(), searchParams, getCurrentUser(), getSignalBars()]);
  const q = (params.q ?? "").trim().slice(0, 40);
  const sector = (params.sector ?? "").trim();
  const sort = SORTS.includes(params.sort as (typeof SORTS)[number]) ? (params.sort as (typeof SORTS)[number]) : "symbol";
  const show = SHOW.includes(params.show as (typeof SHOW)[number]) ? (params.show as (typeof SHOW)[number]) : "all";
  const page = Math.max(1, Number(params.page) || 1);

  const [watched, universe, analysed] = await Promise.all([
    user
      ? prisma.watchlistItem.findMany({ where: { userId: user.id }, select: { symbol: true } }).then((r) => r.map((x) => x.symbol))
      : Promise.resolve([] as string[]),
    prisma.universeStock.findMany({ where: { isActive: true }, select: { symbol: true } }).then((r) => r.map((x) => x.symbol)),
    show === "analysed"
      ? prisma.signalSnapshot.findMany({ distinct: ["symbol"], select: { symbol: true } }).then((r) => r.map((x) => x.symbol))
      : Promise.resolve([] as string[]),
  ]);

  const where: Prisma.CompanyDirectoryEntryWhereInput = {
    AND: [
      q
        ? { OR: [{ symbol: { startsWith: q.toUpperCase() } }, { companyName: { contains: q, mode: "insensitive" } }] }
        : {},
      sector ? { sector } : {},
      show === "watched" ? { symbol: { in: watched } } : {},
      show === "universe" ? { symbol: { in: universe } } : {},
      show === "analysed" ? { symbol: { in: analysed } } : {},
    ],
  };

  const [rows, total, all, sectors] = await Promise.all([
    prisma.companyDirectoryEntry.findMany({
      where,
      orderBy: sort === "name" ? { companyName: "asc" } : { symbol: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { symbol: true, companyName: true, sector: true },
    }),
    prisma.companyDirectoryEntry.count({ where }),
    prisma.companyDirectoryEntry.count(),
    prisma.companyDirectoryEntry.groupBy({
      by: ["sector"],
      where: { sector: { not: null } },
      _count: { sector: true },
      orderBy: { sector: "asc" },
    }),
  ]);
  const withSector = sectors.reduce((sum, s) => sum + s._count.sector, 0);

  const latest = await prisma.signalSnapshot.findMany({
    where: { symbol: { in: rows.map((r) => r.symbol) } },
    orderBy: { runDate: "desc" },
    distinct: ["symbol"],
    select: { symbol: true, zScore: true, fitQuality: true, constituentCount: true, runDate: true },
  });
  const latestBy = new Map(latest.map((l) => [l.symbol, l]));
  const watchedSet = new Set(watched);
  const universeSet = new Set(universe);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) =>
    `/stocks/list?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(sector ? { sector } : {}),
      ...(sort !== "symbol" ? { sort } : {}),
      ...(show !== "all" ? { show } : {}),
      page: String(p),
    })}`;

  return (
    <>
      <PageHeader title={t("list.title")} description={t("list.description", { count: all })} />

      <Card>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end" role="search">
          <div>
            <label htmlFor="list-q" className={LABEL}>{t("list.search")}</label>
            <input id="list-q" name="q" defaultValue={q} placeholder={t("list.searchPlaceholder")} className={INPUT} />
          </div>
          <div>
            <label htmlFor="list-sector" className={LABEL}>{t("list.sector")}</label>
            <select id="list-sector" name="sector" defaultValue={sector} className={INPUT}>
              <option value="">{t("list.allSectors")}</option>
              {sectors.map((s) => (
                <option key={s.sector} value={s.sector ?? ""}>
                  {s.sector} ({s._count.sector})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="list-show" className={LABEL}>{t("list.show")}</label>
            <select id="list-show" name="show" defaultValue={show} className={INPUT}>
              {SHOW.map((s) => (
                <option key={s} value={s}>{t(`list.show.${s}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="list-sort" className={LABEL}>{t("list.sort")}</label>
            <select id="list-sort" name="sort" defaultValue={sort} className={INPUT}>
              <option value="symbol">{t("list.sort.symbol")}</option>
              <option value="name">{t("list.sort.name")}</option>
            </select>
          </div>
          <button type="submit" className={`${BUTTON_SMALL} h-11 px-5`}>{t("list.apply")}</button>
        </form>
        <p className="mt-3 text-xs text-text-subtle">{t("list.sectorCoverage", { known: withSector, total: all })}</p>
      </Card>

      {all === 0 ? (
        <EmptyState title={t("list.emptyTitle")} description={t("list.emptyBody")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("list.noMatchTitle")} description={t("list.noMatchBody")} />
      ) : (
        <Card className="p-0">
          <p className="px-6 pt-5 text-sm text-text-muted">{t("list.showing", { count: total })}</p>
          <ul className="mt-3 divide-y divide-border">
            {rows.map((row) => {
              const l = latestBy.get(row.symbol);
              const signal = l ? isSignal(l, bars) : false;
              return (
                <li key={row.symbol} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/stocks?symbol=${row.symbol}`} className="text-[15px] font-extrabold tracking-wide text-text hover:text-accent">
                        {row.symbol}
                      </Link>
                      {watchedSet.has(row.symbol) ? <Badge tone="accent">{t("list.badge.watched")}</Badge> : null}
                      {universeSet.has(row.symbol) ? <Badge tone="neutral">{t("list.badge.universe")}</Badge> : null}
                      {l ? (
                        <Badge tone={signal ? "extreme" : "normal"}>
                          {t(signal ? "list.badge.signal" : "list.badge.analysed", { z: l.zScore.toFixed(1), date: l.runDate })}
                        </Badge>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-text-muted">
                      {row.companyName}
                      {row.sector ? <span className="text-text-subtle"> · {row.sector}</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/stocks?symbol=${row.symbol}`} className={BUTTON_SMALL}>{t("list.analyse")}</Link>
                    <Link href={`/stocks/compare?symbols=${row.symbol}`} className={BUTTON_SMALL}>{t("list.compare")}</Link>
                    {user && !watchedSet.has(row.symbol) ? (
                      <ActionForm action={watchFromList}>
                        <input type="hidden" name="symbol" value={row.symbol} />
                        <SubmitButton className={BUTTON_SMALL}>{t("list.watch")}</SubmitButton>
                      </ActionForm>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {pages > 1 ? (
            <nav aria-label={t("list.pages")} className="flex items-center justify-between border-t border-border px-6 py-4 text-sm">
              <span className="text-text-muted">{t("list.page", { page, pages })}</span>
              <span className="flex gap-2">
                {page > 1 ? <Link className={BUTTON_SMALL} href={href(page - 1)}>{t("list.prev")}</Link> : null}
                {page < pages ? <Link className={BUTTON_SMALL} href={href(page + 1)}>{t("list.next")}</Link> : null}
              </span>
            </nav>
          ) : null}
        </Card>
      )}
    </>
  );
}
