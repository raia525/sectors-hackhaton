"use client";

import Link from "next/link";
import type { ComparisonResult } from "@/lib/analysis/compare";
import { Badge, formatPercent, formatSigned, type BadgeTone } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { DivergenceVerdict } from "@/lib/shadow/types";

/**
 * Comparison results.
 *
 * Rendered as cards on narrow screens and a table on wide ones. A financial
 * table forced into a phone viewport either scrolls horizontally, which hides
 * the column that matters, or shrinks text below a readable size. The card
 * layout keeps every figure labelled at any width.
 *
 * The idiosyncratic column carries a bar because it is the one users should
 * compare across rows, and a shared scale makes that comparison visual rather
 * than arithmetic.
 */

const VERDICT_COPY: Record<DivergenceVerdict, { tone: BadgeTone; key: TranslationKey }> = {
  extreme: { tone: "extreme", key: "verdict.divergence.extreme" },
  significant: { tone: "significant", key: "verdict.divergence.significant" },
  moderate: { tone: "moderate", key: "verdict.divergence.moderate" },
  normal: { tone: "normal", key: "verdict.divergence.normal" },
  aligned: { tone: "normal", key: "verdict.divergence.aligned" },
};

export function ComparisonTable({ result }: { result: ComparisonResult }) {
  const { t, tm } = useTranslation();
  const { entries, ranked } = result;
  const failures = entries.filter((e) => !e.ok);

  if (ranked.length === 0) {
    return (
      <div className="rounded-[var(--radius-sm)] bg-surface-raised p-5">
        <p className="text-sm text-text-muted">{t("compare.noneUsable")}</p>
        {failures.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {failures.map((f) => (
              <li key={f.symbol} className="text-sm text-text-subtle">
                <span className="font-medium text-text-muted">{f.symbol}</span>{" "}
                {!f.ok ? tm(f.reason) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const scale = Math.max(...ranked.map((r) => Math.abs(r.idiosyncratic)), 0.001);

  return (
    <div className="space-y-4">
      {/* Wide screens: aligned table for scanning down a column. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("compare.tableCaption")}</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <Th>{t("compare.tableStock")}</Th>
              <Th align="right">{t("compare.tableTotal")}</Th>
              <Th align="right">{t("compare.tableMarket")}</Th>
              <Th align="right">{t("compare.tablePeers")}</Th>
              <Th align="right">{t("compare.tableSpecific")}</Th>
              <Th align="right">{t("compare.tableZScore")}</Th>
              <Th align="right">{t("compare.tableFit")}</Th>
              <Th>{t("compare.tableVerdict")}</Th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => {
              const verdict = VERDICT_COPY[row.verdict];
              return (
                <tr key={row.symbol} className={`border-b border-border last:border-0 ${row === ranked[0] ? "bg-accent-soft" : ""}`}>
                  <td className="py-3.5 pl-3 pr-3">
                    <Link
                      href={`/stocks?symbol=${row.symbol}`}
                      className="font-bold text-text hover:text-accent"
                    >
                      {row.symbol}
                    </Link>
                    <div className="max-w-[180px] truncate text-xs text-text-subtle">
                      {row.companyName}
                    </div>
                  </td>
                  <Td value={row.totalReturn} />
                  <Td value={row.marketComponent} muted />
                  <Td value={row.sectorComponent} muted />
                  <td className="py-3.5 px-3 text-right">
                    <div
                      className={`tnum font-medium ${row.idiosyncratic >= 0 ? "text-up" : "text-down"}`}
                    >
                      {formatPercent(row.idiosyncratic)}
                    </div>
                    <div className="mt-1 flex justify-end">
                      <span
                        aria-hidden
                        className="block h-1 rounded-full bg-accent"
                        style={{
                          width: `${Math.max((Math.abs(row.idiosyncratic) / scale) * 56, 3)}px`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="tnum py-3.5 px-3 text-right text-text-muted">
                    {formatSigned(row.zScore)}
                  </td>
                  <td className="tnum py-3.5 px-3 text-right text-text-muted">
                    {(row.fitQuality * 100).toFixed(0)}%
                  </td>
                  <td className="py-3.5 px-3">
                    <Badge tone={verdict.tone}>{t(verdict.key)}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: one card per stock, every figure labelled. */}
      <div className="space-y-3 md:hidden">
        {ranked.map((row) => {
          const verdict = VERDICT_COPY[row.verdict];
          return (
            <div key={row.symbol} className={`rounded-[var(--radius-sm)] p-4 ${row === ranked[0] ? "bg-accent-soft ring-1 ring-accent/40" : "bg-surface-raised"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/stocks?symbol=${row.symbol}`}
                    className="font-medium text-text hover:text-accent"
                  >
                    {row.symbol}
                  </Link>
                  <p className="truncate text-xs text-text-subtle">{row.companyName}</p>
                </div>
                <Badge tone={verdict.tone}>{t(verdict.key)}</Badge>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3">
                <MobileStat
                  label={t("compare.tableTotal")}
                  value={formatPercent(row.totalReturn)}
                />
                <MobileStat
                  label={t("compare.tableSpecific")}
                  value={formatPercent(row.idiosyncratic)}
                  emphasis
                />
                <MobileStat
                  label={t("compare.tableZScore")}
                  value={formatSigned(row.zScore)}
                />
                <MobileStat
                  label={t("compare.tableFit")}
                  value={`${(row.fitQuality * 100).toFixed(0)}%`}
                />
              </dl>
            </div>
          );
        })}
      </div>

      {failures.length > 0 ? (
        <div className="mt-4 rounded-[var(--radius-sm)] bg-surface-raised p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
            {t("compare.notComparedTitle")}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {failures.map((f) => (
              <li key={f.symbol} className="text-sm text-text-muted">
                <span className="font-medium">{f.symbol}</span>{" "}
                {!f.ok ? tm(f.reason) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`pb-3 ${align === "right" ? "pl-3 pr-3 text-right" : "pl-3 pr-3"} text-xs font-semibold text-text-subtle`}
    >
      {children}
    </th>
  );
}

function Td({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <td
      className={`tnum py-3.5 px-3 text-right ${muted ? "text-text-subtle" : value >= 0 ? "text-up" : "text-down"}`}
    >
      {formatPercent(value)}
    </td>
  );
}

function MobileStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-text-subtle">{label}</dt>
      <dd className={`tnum mt-0.5 ${emphasis ? "font-medium text-text" : "text-text-muted"}`}>
        {value}
      </dd>
    </div>
  );
}
