import type { ReactNode } from "react";

/**
 * Shared presentational primitives.
 *
 * Kept deliberately small. Each one encodes a formatting or accessibility rule
 * that would otherwise be repeated and drift: signed numbers always carry their
 * sign, percentages keep a fixed precision so columns align, and every verdict
 * badge carries a text label rather than relying on colour alone.
 */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[10px] border border-border bg-surface p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[13px] font-medium tracking-wide text-text-muted uppercase">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-text-subtle">{description}</p>
        ) : null}
      </div>
      {aside}
    </header>
  );
}

/** A labelled figure. `mono` aligns digits for comparison across rows. */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text";

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-text-subtle">
        {label}
      </div>
      <div className={`tnum mt-1 text-xl ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-text-subtle">{hint}</div> : null}
    </div>
  );
}

/**
 * Formats a fraction as a signed percentage.
 * `0.0734` becomes `+7.34%`.
 */
export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

/** Abbreviates large rupiah figures, which routinely run to trillions. */
export function formatIdr(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(2)} T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(2)} Jt`;
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

export type BadgeTone =
  | "extreme"
  | "significant"
  | "moderate"
  | "normal"
  | "neutral"
  | "accent";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    extreme: "border-signal-extreme/40 text-signal-extreme",
    significant: "border-signal-significant/40 text-signal-significant",
    moderate: "border-signal-moderate/40 text-signal-moderate",
    normal: "border-signal-normal/40 text-signal-normal",
    neutral: "border-border-strong text-text-muted",
    accent: "border-accent/40 text-accent",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Renders the caveats attached to an analysis.
 *
 * This component exists to make omitting them awkward. A confident number
 * without its limits is the failure mode the whole product is built to avoid,
 * so the caveats get real visual weight rather than fine print.
 */
export function Caveats({ items, title = "What this does not tell you" }: { items: string[]; title?: string }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-border bg-surface-raised p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-muted">
            <span aria-hidden className="select-none text-text-subtle">
              &middot;
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Empty state used when an analysis declines to produce a signal. */
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-border-strong p-8 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">{description}</p>
    </div>
  );
}
