import type { KeyStat, KeyStats } from "@/lib/analysis/key-stats";
import { formatIdr } from "./ui/primitives";

/**
 * Headline company statistics.
 *
 * Missing values render as a dash rather than as zero. A company with no
 * reported return on equity and one that earned nothing are different facts,
 * and showing both as "0%" would state something untrue.
 *
 * The 52 week range is drawn as a track with a marker, because "4,850" means
 * little on its own while "near the top of its yearly range" is immediately
 * readable.
 */

export function KeyStatsPanel({ stats }: { stats: KeyStats }) {
  return (
    <div className="space-y-5">
      {stats.rangePosition !== null &&
      stats.low52 !== null &&
      stats.high52 !== null ? (
        <RangeBar
          low={stats.low52}
          high={stats.high52}
          position={stats.rangePosition}
          last={stats.lastClose}
        />
      ) : null}

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {stats.groups.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
              {group.title}
            </h3>
            <dl className="space-y-1.5">
              {group.stats.map((stat) => (
                <StatRow key={stat.label} stat={stat} />
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatRow({ stat }: { stat: KeyStat }) {
  const hasValue = stat.value !== null && Number.isFinite(stat.value);

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-text-muted" title={stat.hint}>
        {stat.label}
        {stat.hint ? (
          <span className="ml-1 cursor-help text-text-subtle" aria-hidden>
            &#9432;
          </span>
        ) : null}
        {stat.hint ? <span className="sr-only">. {stat.hint}</span> : null}
      </dt>
      <dd
        className={`tnum shrink-0 text-sm ${hasValue ? "text-text" : "text-text-subtle"}`}
      >
        {hasValue ? formatStat(stat.value as number, stat.format) : "not reported"}
      </dd>
    </div>
  );
}

function formatStat(value: number, format: KeyStat["format"]): string {
  switch (format) {
    case "currency":
      return formatIdr(value);
    case "percent": {
      const sign = value > 0 ? "+" : "";
      return `${sign}${(value * 100).toFixed(2)}%`;
    }
    case "multiple":
      return `${value.toFixed(2)}x`;
    case "ratio":
      return value.toFixed(2);
    case "number":
      return value.toLocaleString("id-ID");
  }
}

function RangeBar({
  low,
  high,
  position,
  last,
}: {
  low: number;
  high: number;
  position: number;
  last: number | null;
}) {
  const pct = position * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-text-subtle">
          52 week range
        </span>
        {last !== null ? (
          <span className="tnum text-sm text-text">{formatIdr(last)}</span>
        ) : null}
      </div>

      <div
        className="relative h-1.5 rounded-full bg-surface-raised"
        role="img"
        aria-label={`The price sits ${pct.toFixed(0)} percent of the way between its 52 week low of ${low.toLocaleString("id-ID")} and its high of ${high.toLocaleString("id-ID")}.`}
      >
        <div
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-accent"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-xs text-text-subtle">
        <span className="tnum">{low.toLocaleString("id-ID")}</span>
        <span className="tnum">{high.toLocaleString("id-ID")}</span>
      </div>
    </div>
  );
}
