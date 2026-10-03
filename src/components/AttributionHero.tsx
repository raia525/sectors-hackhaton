"use client";

import Link from "next/link";
import type { ReturnAttribution } from "@/lib/shadow/types";
import { formatPercent, formatSigned } from "./ui/primitives";
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from "./ui/icons";
import { useTranslation } from "@/lib/i18n/client";

/**
 * The return split into its three parts, on the accent panel.
 *
 * The three parts sum to the total by construction but can carry opposite
 * signs, so each gets its own tile rather than a stacked bar (a +3% market
 * part and a -3% company part would otherwise draw as a 6% bar that means
 * nothing). The company's own part is the white tile, since it is the only one
 * carrying information about the company itself.
 *
 * Direction is marked with a green or red arrow on a white chip: the semantic
 * colours stay intact, and they never sit directly on orange where they would
 * lose contrast.
 */
export function AttributionHero({
  attribution,
  zScore,
  fitQuality,
  sessions,
  trackHref,
}: {
  attribution: ReturnAttribution;
  zScore: number;
  fitQuality: number;
  sessions: number;
  trackHref: string;
}) {
  const { t } = useTranslation();

  const parts = [
    {
      label: t("attribution.market"),
      description: t("attribution.marketDescription"),
      value: attribution.market,
      emphasis: false,
    },
    {
      label: t("attribution.sector"),
      description: t("attribution.sectorDescription"),
      value: attribution.sector,
      emphasis: false,
    },
    {
      label: t("attribution.specific"),
      description: t("attribution.specificDescription"),
      value: attribution.idiosyncratic,
      emphasis: true,
    },
  ];

  return (
    // Sticky on wide screens: the peer list beside it can run long, and the
    // split is what the list is being read against.
    <section className="accent-panel flex flex-col rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] xl:sticky xl:top-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xs">
          <h3 className="text-[17px] font-extrabold tracking-tight text-text">
            {t("analysis.breakdownTitle")}
          </h3>
          <p className="mt-1 text-[13px] leading-snug text-text-muted">{t("hero.subtitle")}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-text-subtle">
            {t("attribution.totalReturn")}
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold leading-none tracking-tight">
            {formatPercent(attribution.total)}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {parts.map((part) => (
          <Part key={part.label} {...part} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5 border-t border-border pt-5">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <Figure label={t("verdict.stat.zScore")} value={formatSigned(zScore)} />
          <Figure label={t("verdict.stat.twinFit")} value={`${Math.round(fitQuality * 100)}%`} />
          <Figure label={t("hero.sessions")} value={String(sessions)} />
        </dl>
        <Link
          href={trackHref}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-bright)_72%,black)] shadow-sm transition-transform hover:-translate-y-0.5"
        >
          {t("analysis.trackCta")}
          <IconArrowRight size={16} />
        </Link>
      </div>

      <p className="mt-4 text-xs text-text-subtle">{t("attribution.footnote")}</p>
    </section>
  );
}

function Part({
  label,
  description,
  value,
  emphasis,
}: {
  label: string;
  description: string;
  value: number;
  emphasis: boolean;
}) {
  const up = value >= 0;
  const Arrow = up ? IconArrowUpRight : IconArrowDownRight;

  return (
    <div
      className={`flex flex-col rounded-[var(--radius-sm)] p-4 ${
        emphasis
          ? "bg-white text-[#15151a] shadow-lg shadow-black/10"
          : "border border-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[13px] font-semibold ${emphasis ? "text-[#62626d]" : "text-text-muted"}`}
        >
          {label}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            emphasis ? (up ? "bg-emerald-50" : "bg-red-50") : "bg-white"
          } ${up ? "text-emerald-600" : "text-red-600"}`}
          aria-hidden
        >
          <Arrow size={15} />
        </span>
      </div>
      <div
        className={`tnum mt-3 text-[26px] font-extrabold leading-none tracking-tight ${
          emphasis ? (up ? "text-emerald-700" : "text-red-600") : ""
        }`}
      >
        {formatPercent(value)}
      </div>
      <p
        className={`mt-2 text-xs leading-snug ${emphasis ? "text-[#62626d]" : "text-text-subtle"}`}
      >
        {description}
      </p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-subtle">{label}</dt>
      <dd className="tnum mt-1 text-lg font-extrabold">{value}</dd>
    </div>
  );
}
