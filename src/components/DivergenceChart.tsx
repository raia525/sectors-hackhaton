"use client";

import { useId } from "react";
import type { ShadowPoint } from "@/lib/shadow/types";
import { useTranslation } from "@/lib/i18n/client";

/**
 * Actual cumulative return against its synthetic twin, with the gap shaded.
 *
 * Drawn as inline SVG rather than with a charting library. The shape is simple,
 * two paths and a filled band, and hand-drawing it avoids shipping a charting
 * runtime for one figure, keeps the server render free of client JavaScript for
 * the static case, and gives exact control over how the divergence band reads.
 *
 * The band between the two lines is the point of the chart, so it carries the
 * fill while the lines themselves stay thin.
 */

interface Props {
  series: ShadowPoint[];
  symbol: string;
  height?: number;
}

const PAD = { top: 16, right: 12, bottom: 22, left: 44 };

export function DivergenceChart({ series, symbol, height = 260 }: Props) {
  const clipId = useId();
  const { t } = useTranslation();

  if (series.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-[10px] border border-dashed border-border-strong">
        <p className="text-sm text-text-muted">{t("chart.notEnoughHistory")}</p>
      </div>
    );
  }

  // A fixed viewBox with preserveAspectRatio left free lets the SVG scale to
  // any container width without a resize observer.
  const width = 720;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const values = series.flatMap((p) => [p.actual, p.shadow]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Pad the domain so the lines never touch the frame edge.
  const span = rawMax - rawMin || 0.02;
  const min = rawMin - span * 0.12;
  const max = rawMax + span * 0.12;

  const x = (i: number) => PAD.left + (i / (series.length - 1)) * innerW;
  const y = (v: number) => PAD.top + ((max - v) / (max - min)) * innerH;

  const linePath = (key: "actual" | "shadow") =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p[key]).toFixed(2)}`).join(" ");

  // The band is the actual line out and the shadow line back, closed.
  const bandPath = [
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.actual).toFixed(2)}`).join(" "),
    series
      .slice()
      .reverse()
      .map((p, i) => `L${x(series.length - 1 - i).toFixed(2)},${y(p.shadow).toFixed(2)}`)
      .join(" "),
    "Z",
  ].join(" ");

  const ticks = buildTicks(min, max, 4);
  const last = series[series.length - 1];
  const diverged = last.divergence >= 0;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("chart.ariaLabel", {
          symbol,
          twinPct: (last.shadow * 100).toFixed(1),
          actualPct: (last.actual * 100).toFixed(1),
          gapPct: (last.divergence * 100).toFixed(1),
        })}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--text-subtle)"
              className="tnum"
            >
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Zero line drawn stronger: it separates gain from loss. */}
        {min < 0 && max > 0 ? (
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--border-strong)"
            strokeWidth={1}
          />
        ) : null}

        <g clipPath={`url(#${clipId})`}>
          <path
            d={bandPath}
            fill={diverged ? "var(--up)" : "var(--down)"}
            opacity={0.12}
          />
          <path
            d={linePath("shadow")}
            fill="none"
            stroke="var(--text-subtle)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <path
            d={linePath("actual")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={x(series.length - 1)} cy={y(last.actual)} r={3} fill="var(--accent)" />
        </g>

        <text
          x={PAD.left}
          y={height - 6}
          fontSize={10}
          fill="var(--text-subtle)"
          className="tnum"
        >
          {series[0].date}
        </text>
        <text
          x={width - PAD.right}
          y={height - 6}
          textAnchor="end"
          fontSize={10}
          fill="var(--text-subtle)"
          className="tnum"
        >
          {last.date}
        </text>
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 rounded" style={{ background: "var(--accent)" }} />
          {t("chart.actual", { symbol })}
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-0.5 w-5 rounded"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--text-subtle) 0 4px, transparent 4px 7px)",
            }}
          />
          {t("chart.syntheticTwin")}
        </span>
        <span className="text-text-subtle">{t("chart.divergenceCaption")}</span>
      </figcaption>
    </figure>
  );
}

/** Rounded tick values across a domain, chosen for legibility over precision. */
function buildTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(step) || 0.01)));
  const niceStep = Math.ceil(step / magnitude) * magnitude;
  const start = Math.ceil(min / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let t = start; t <= max; t += niceStep) ticks.push(Number(t.toFixed(6)));
  return ticks;
}
