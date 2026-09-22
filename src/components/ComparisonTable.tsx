import Link from "next/link";
import type { ComparisonResult } from "@/lib/analysis/compare";
import { Badge, Card, formatPercent, formatSigned, type BadgeTone } from "./ui/primitives";

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

const VERDICT_TONE: Record<string, BadgeTone> = {
  extreme: "extreme",
  significant: "significant",
  moderate: "moderate",
  normal: "normal",
  aligned: "normal",
};

export function ComparisonTable({ result }: { result: ComparisonResult }) {
  const { entries, ranked } = result;
  const failures = entries.filter((e) => !e.ok);

  if (ranked.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-muted">
          None of the selected stocks produced a usable twin.
        </p>
        {failures.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {failures.map((f) => (
              <li key={f.symbol} className="text-sm text-text-subtle">
                <span className="font-medium text-text-muted">{f.symbol}</span>{" "}
                {!f.ok ? f.reason : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    );
  }

  const scale = Math.max(...ranked.map((r) => Math.abs(r.idiosyncratic)), 0.001);

  return (
    <div className="space-y-4">
      {/* Wide screens: aligned table for scanning down a column. */}
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Stocks ranked by how far each has diverged from its synthetic twin.
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <Th>Stock</Th>
              <Th align="right">Total</Th>
              <Th align="right">Market</Th>
              <Th align="right">Peers</Th>
              <Th align="right">Stock specific</Th>
              <Th align="right">Z score</Th>
              <Th align="right">Fit</Th>
              <Th>Verdict</Th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.symbol} className="border-b border-border last:border-0">
                <td className="py-3 pr-3">
                  <Link
                    href={`/?symbol=${row.symbol}`}
                    className="font-medium text-text hover:text-accent"
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
                <td className="py-3 pl-3 text-right">
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
                <td className="tnum py-3 pl-3 text-right text-text-muted">
                  {formatSigned(row.zScore)}
                </td>
                <td className="tnum py-3 pl-3 text-right text-text-muted">
                  {(row.fitQuality * 100).toFixed(0)}%
                </td>
                <td className="py-3 pl-3">
                  <Badge tone={VERDICT_TONE[row.verdict] ?? "neutral"}>
                    {row.verdict.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Narrow screens: one card per stock, every figure labelled. */}
      <div className="space-y-3 md:hidden">
        {ranked.map((row) => (
          <Card key={row.symbol}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/?symbol=${row.symbol}`}
                  className="font-medium text-text hover:text-accent"
                >
                  {row.symbol}
                </Link>
                <p className="truncate text-xs text-text-subtle">{row.companyName}</p>
              </div>
              <Badge tone={VERDICT_TONE[row.verdict] ?? "neutral"}>
                {row.verdict.replace(/_/g, " ")}
              </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-3">
              <MobileStat label="Total return" value={formatPercent(row.totalReturn)} />
              <MobileStat
                label="Stock specific"
                value={formatPercent(row.idiosyncratic)}
                emphasis
              />
              <MobileStat label="Z score" value={formatSigned(row.zScore)} />
              <MobileStat label="Twin fit" value={`${(row.fitQuality * 100).toFixed(0)}%`} />
            </dl>
          </Card>
        ))}
      </div>

      {failures.length > 0 ? (
        <Card>
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
            Not compared
          </h3>
          <ul className="mt-2 space-y-1.5">
            {failures.map((f) => (
              <li key={f.symbol} className="text-sm text-text-muted">
                <span className="font-medium">{f.symbol}</span>{" "}
                {!f.ok ? f.reason : null}
              </li>
            ))}
          </ul>
        </Card>
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
      className={`pb-2 ${align === "right" ? "pl-3 text-right" : "pr-3"} text-[11px] font-medium uppercase tracking-wide text-text-subtle`}
    >
      {children}
    </th>
  );
}

function Td({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <td
      className={`tnum py-3 pl-3 text-right ${muted ? "text-text-subtle" : value >= 0 ? "text-up" : "text-down"}`}
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
