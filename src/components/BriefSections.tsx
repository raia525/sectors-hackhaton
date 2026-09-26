import Link from "next/link";
import type { Brief, BriefRow, SectorRow } from "@/lib/intelligence/brief";
import type { CalendarEntry } from "@/lib/intelligence/calendar";
import type { TrackRecord } from "@/lib/intelligence/track-record";
import { divergenceLabel, realityLabel, smartMoneyLabel } from "@/lib/intelligence/labels";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { FlatParams } from "@/lib/i18n/translate";
import type { Message } from "@/lib/i18n/message";
import type { DivergenceVerdict } from "@/lib/shadow/types";
import type { DivergenceType } from "@/lib/smartmoney/types";
import { DIVERGENCE_COPY, REALITY_COPY, SMART_MONEY_COPY } from "./verdictCopy";
import { Badge, formatIdr, formatPercent, formatSigned } from "./ui/primitives";

/**
 * The sections of the market brief page.
 *
 * Server components with the translator passed in, since the page renders
 * entirely from stored data and needs no client state.
 */

export type T = (key: TranslationKey, params?: FlatParams) => string;
export type TM = (message: Message) => string;

function divergenceTone(verdict: string) {
  return (DIVERGENCE_COPY[verdict as DivergenceVerdict] ?? DIVERGENCE_COPY.normal).tone;
}

function StockCell({ row }: { row: BriefRow }) {
  return (
    <div className="min-w-0">
      <Link href={`/?symbol=${row.symbol}`} className="font-bold text-text hover:text-accent">
        {row.symbol}
      </Link>
      <div className="max-w-[200px] truncate text-xs text-text-subtle">{row.companyName}</div>
    </div>
  );
}

export function MoversTable({ rows, t }: { rows: BriefRow[]; t: T }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{t("brief.moversEmpty")}</p>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("brief.moversTitle")}</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
              <th scope="col" className="pb-3 pr-3">{t("compare.tableStock")}</th>
              <th scope="col" className="pb-3 px-3 text-right">{t("compare.tableSpecific")}</th>
              <th scope="col" className="pb-3 px-3 text-right">{t("compare.tableZScore")}</th>
              <th scope="col" className="pb-3 px-3 text-right">{t("compare.tableFit")}</th>
              <th scope="col" className="pb-3 px-3">{t("compare.tableVerdict")}</th>
              <th scope="col" className="pb-3 pl-3">{t("brief.tableNews")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.symbol} className="border-b border-border last:border-0">
                <td className="py-3.5 pr-3">
                  <StockCell row={row} />
                </td>
                <td
                  className={`tnum py-3.5 px-3 text-right font-semibold ${row.idioReturn >= 0 ? "text-up" : "text-down"}`}
                >
                  {formatPercent(row.idioReturn)}
                </td>
                <td className="tnum py-3.5 px-3 text-right text-text-muted">
                  {formatSigned(row.zScore)}
                </td>
                <td className="tnum py-3.5 px-3 text-right text-text-muted">
                  {Math.round(row.fitQuality * 100)}%
                </td>
                <td className="py-3.5 px-3">
                  <Badge tone={divergenceTone(row.verdict)}>{t(divergenceLabel(row.verdict))}</Badge>
                </td>
                <td className="py-3.5 pl-3 text-text-muted">{t(realityLabel(row.realityVerdict))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.symbol} className="rounded-[var(--radius-sm)] bg-surface-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <StockCell row={row} />
              <Badge tone={divergenceTone(row.verdict)}>{t(divergenceLabel(row.verdict))}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <MiniStat label={t("compare.tableSpecific")} value={formatPercent(row.idioReturn)} />
              <MiniStat label={t("compare.tableZScore")} value={formatSigned(row.zScore)} />
              <MiniStat label={t("compare.tableFit")} value={`${Math.round(row.fitQuality * 100)}%`} />
            </dl>
            <p className="mt-2 text-xs text-text-subtle">{t(realityLabel(row.realityVerdict))}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-text-subtle">{label}</dt>
      <dd className="tnum mt-0.5 font-semibold text-text">{value}</dd>
    </div>
  );
}

export function DisagreementList({ rows, t }: { rows: BriefRow[]; t: T }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{t("brief.disagreementsEmpty")}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const copy = REALITY_COPY[row.realityVerdict as keyof typeof REALITY_COPY];
        return (
          <li key={row.symbol} className="flex items-center justify-between gap-3 py-3">
            <StockCell row={row} />
            <div className="text-right">
              <Badge tone={copy?.tone ?? "neutral"}>{t(realityLabel(row.realityVerdict))}</Badge>
              <div className="tnum mt-1 text-xs text-text-subtle">
                {t("compare.tableSpecific")} {formatPercent(row.idioReturn)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SmartMoneyList({ rows, t }: { rows: BriefRow[]; t: T }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{t("brief.smartMoneyEmpty")}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const type = row.smartMoneyType ?? "no_signal";
        const copy = SMART_MONEY_COPY[type as DivergenceType];
        return (
          <li key={row.symbol} className="flex items-center justify-between gap-3 py-3">
            <StockCell row={row} />
            <div className="text-right">
              <Badge tone={copy?.tone ?? "neutral"}>{t(smartMoneyLabel(type))}</Badge>
              <div className="tnum mt-1 text-xs text-text-subtle">
                {t("brief.conviction", { value: Math.round(row.smartMoneyConviction ?? 0) })}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SectorTable({
  sectors,
  singleStockSectors,
  t,
}: {
  sectors: SectorRow[];
  singleStockSectors: string[];
  t: T;
}) {
  return (
    <div className="space-y-4">
      {sectors.length === 0 ? (
        <p className="text-sm text-text-muted">{t("brief.sectorEmpty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">{t("brief.sectorTitle")}</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
                <th scope="col" className="pb-3 pr-3">{t("brief.tableSector")}</th>
                <th scope="col" className="pb-3 px-3 text-right">{t("brief.tableStocks")}</th>
                <th scope="col" className="pb-3 px-3 text-right">{t("compare.tableMarket")}</th>
                <th scope="col" className="pb-3 px-3 text-right">{t("compare.tablePeers")}</th>
                <th scope="col" className="pb-3 px-3 text-right">{t("compare.tableSpecific")}</th>
                <th scope="col" className="pb-3 pl-3 text-right">{t("brief.tableSignals")}</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.sector} className="border-b border-border last:border-0">
                  <td className="py-3 pr-3 font-semibold text-text">{s.sector}</td>
                  <td className="tnum py-3 px-3 text-right text-text-muted">{s.count}</td>
                  <td className="tnum py-3 px-3 text-right text-text-subtle">{formatPercent(s.avgMarket)}</td>
                  <td className="tnum py-3 px-3 text-right text-text-subtle">{formatPercent(s.avgSector)}</td>
                  <td
                    className={`tnum py-3 px-3 text-right font-semibold ${s.avgIdio >= 0 ? "text-up" : "text-down"}`}
                  >
                    {formatPercent(s.avgIdio)}
                  </td>
                  <td className="tnum py-3 pl-3 text-right text-text-muted">{s.signalCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {singleStockSectors.length > 0 ? (
        <p className="text-xs text-text-subtle">
          {t("brief.sectorSingle", { sectors: singleStockSectors.join(", ") })}
        </p>
      ) : null}
    </div>
  );
}

export function CalendarList({ entries, t, tm }: { entries: CalendarEntry[]; t: T; tm: TM }) {
  if (entries.length === 0) {
    return <p className="text-sm text-text-muted">{t("brief.calendarEmpty")}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {entries.map(({ symbol, item }, i) => (
        <li key={`${symbol}-${item.date}-${i}`} className="flex gap-4 py-3">
          <div className="tnum w-24 shrink-0 text-sm font-semibold text-text">{item.date}</div>
          <div className="min-w-0">
            <div className="text-sm text-text">
              <Link href={`/?symbol=${symbol}`} className="font-bold hover:text-accent">
                {symbol}
              </Link>{" "}
              {tm(item.summary)}
            </div>
            {item.effect?.cashIdr != null ? (
              <div className="mt-0.5 text-xs text-text-muted">
                {t("actions.receiveCash", { amount: formatIdr(item.effect.cashIdr) })}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TrackRecordPanel({ record, t }: { record: TrackRecord; t: T }) {
  if (!record.enough) {
    return (
      <div className="rounded-[var(--radius-sm)] bg-surface-raised p-5">
        <p className="text-sm leading-relaxed text-text-muted">
          {t("brief.trackInsufficient", {
            count: record.signals.count,
            needed: record.minSample,
          })}
        </p>
        <p className="mt-2 text-xs text-text-subtle">
          {t("brief.trackOrdinaryCount", { count: record.ordinary.count })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Bucket title={t("brief.trackSignals")} bucket={record.signals} t={t} emphasis />
      <Bucket title={t("brief.trackOrdinary")} bucket={record.ordinary} t={t} />
    </div>
  );
}

function Bucket({
  title,
  bucket,
  t,
  emphasis = false,
}: {
  title: string;
  bucket: TrackRecord["signals"];
  t: T;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-sm)] p-5 ${emphasis ? "accent-panel" : "bg-surface-raised"}`}
    >
      <div className="text-[13px] font-semibold text-text-muted">{title}</div>
      {bucket.continuedShare === null ? (
        <p className="mt-3 text-sm text-text-muted">
          {t("brief.trackBucketThin", { count: bucket.count })}
        </p>
      ) : (
        <>
          <div className="tnum mt-3 text-[30px] font-extrabold leading-none tracking-tight text-text">
            {Math.round(bucket.continuedShare * 100)}%
          </div>
          <p className="mt-2 text-[13px] leading-snug text-text-muted">{t("brief.trackContinued")}</p>
          <p className="tnum mt-3 text-xs text-text-subtle">
            {t("brief.trackExcess", { value: formatPercent(bucket.avgSignedExcess ?? 0) })}
          </p>
          <p className="tnum mt-1 text-xs text-text-subtle">
            {t("brief.trackCount", { count: bucket.count })}
          </p>
        </>
      )}
    </div>
  );
}

export function coverageNotes(
  brief: Brief,
  skipped: string[],
  failed: string[],
  t: T,
): string[] {
  const notes: string[] = [];
  for (const row of brief.unreliable) {
    notes.push(
      t("brief.unreliableLine", {
        symbol: row.symbol,
        fit: `${Math.round(row.fitQuality * 100)}%`,
      }),
    );
  }
  if (skipped.length > 0) notes.push(t("brief.skippedLine", { symbols: skipped.join(", ") }));
  if (failed.length > 0) notes.push(t("brief.failedLine", { symbols: failed.join(", ") }));
  return notes;
}
