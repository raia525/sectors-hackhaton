"use client";

import type { ReturnAttribution } from "@/lib/shadow/types";
import { formatPercent } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";

/**
 * The product's central chart: a stock's move split into what the market
 * explains, what comparable companies explain, and what is left over.
 *
 * Design reasoning. The three components sum to the total return but can have
 * opposing signs, so a stacked bar would misrepresent them: a +3% market
 * contribution and a -3% idiosyncratic one would render as a 6% bar that
 * corresponds to nothing. Instead each component gets its own row on a shared
 * scale, diverging from a common zero line. Magnitude and direction stay
 * readable at a glance and the rows remain directly comparable.
 *
 * The stock-specific row is visually emphasised because it is the only one
 * carrying information about the company itself.
 */

interface Props {
  attribution: ReturnAttribution;
}

interface Row {
  label: string;
  value: number;
  description: string;
  emphasis: boolean;
}

export function AttributionBar({ attribution }: Props) {
  const { t } = useTranslation();

  const rows: Row[] = [
    {
      label: t("attribution.market"),
      value: attribution.market,
      description: t("attribution.marketDescription"),
      emphasis: false,
    },
    {
      label: t("attribution.sector"),
      value: attribution.sector,
      description: t("attribution.sectorDescription"),
      emphasis: false,
    },
    {
      label: t("attribution.specific"),
      value: attribution.idiosyncratic,
      description: t("attribution.specificDescription"),
      emphasis: true,
    },
  ];

  // A shared scale across rows, so bar lengths are comparable to each other.
  const scale = Math.max(
    ...rows.map((r) => Math.abs(r.value)),
    Math.abs(attribution.total),
    0.001,
  );

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-text-subtle">
          {t("attribution.totalReturn")}
        </span>
        <span
          className={`tnum text-lg ${attribution.total >= 0 ? "text-up" : "text-down"}`}
        >
          {formatPercent(attribution.total)}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <AttributionRow key={row.label} row={row} scale={scale} />
        ))}
      </div>

      <p className="mt-4 text-xs text-text-subtle">{t("attribution.footnote")}</p>
    </div>
  );
}

function AttributionRow({ row, scale }: { row: Row; scale: number }) {
  const magnitude = Math.min(Math.abs(row.value) / scale, 1);
  const widthPct = magnitude * 50; // each half of the axis is 50% of the track
  const positive = row.value >= 0;

  const barColor = row.emphasis
    ? "var(--accent)"
    : positive
      ? "var(--up)"
      : "var(--down)";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <span
          className={`text-sm ${row.emphasis ? "font-medium text-text" : "text-text-muted"}`}
        >
          {row.label}
        </span>
        <span
          className={`tnum text-sm ${row.emphasis ? "font-medium text-text" : "text-text-muted"}`}
        >
          {formatPercent(row.value)}
        </span>
      </div>

      <div
        className="relative h-2 rounded-full bg-surface-raised"
        role="img"
        aria-label={`${row.label}: ${formatPercent(row.value)}. ${row.description}.`}
      >
        {/* Zero line at the centre, giving both directions a shared origin. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 rounded-full transition-[width]"
          style={{
            width: `${widthPct}%`,
            backgroundColor: barColor,
            left: positive ? "50%" : undefined,
            right: positive ? undefined : "50%",
            opacity: row.emphasis ? 1 : 0.75,
          }}
        />
      </div>

      <p className="mt-1 text-xs text-text-subtle">{row.description}</p>
    </div>
  );
}
