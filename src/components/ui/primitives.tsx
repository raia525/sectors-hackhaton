import type { HTMLAttributes, ReactNode } from "react";

/**
 * Shared presentational primitives.
 *
 * Kept deliberately small. Each one encodes a formatting, layout or
 * accessibility rule that would otherwise be repeated and drift: signed numbers
 * always carry their sign, every page uses the same content width, and every
 * verdict badge carries a text label rather than relying on colour alone.
 */

/**
 * Page content width.
 *
 * Sized for a laptop browser (1280 to 1536px wide): wide enough that the
 * analysis grid fits two and four columns side by side without cramping, but
 * capped so text lines stay readable on a large external monitor.
 */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-5 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

/** Large page title with an optional back link, subtitle and actions. */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="flex min-w-0 items-start gap-4">
        {back}
        <div className="min-w-0">
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-text lg:text-[38px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * A dark container, dark in both themes.
 *
 * Reserved for the primary evidence on a page. The `.ink` class re-points the
 * colour tokens, so any component placed inside renders dark unchanged.
 */
export function InkPanel({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <section
      {...rest}
      className={`ink rounded-[var(--radius-lg)] border border-border p-5 shadow-[var(--shadow-card)] lg:p-6 ${className}`}
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
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[16px] font-bold tracking-tight text-text">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p>
        ) : null}
      </div>
      {aside}
    </header>
  );
}

/** A round icon badge, used in the top corner of stat cards. */
export function IconBadge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "up" | "down" | "neutral";
}) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    up: "bg-up/12 text-up",
    down: "bg-down/12 text-down",
    neutral: "bg-surface-raised text-text-muted",
  } as const;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * A headline figure card: small label, icon in the corner, one large number,
 * and a caption that says what the number means.
 */
export function StatCard({
  label,
  value,
  caption,
  icon,
  tone = "neutral",
  iconTone = "accent",
  footer,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "up" | "down";
  iconTone?: "accent" | "up" | "down" | "neutral";
  footer?: ReactNode;
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text";

  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold text-text-muted">{label}</span>
        {icon ? <IconBadge tone={iconTone}>{icon}</IconBadge> : null}
      </div>
      <div
        className={`tnum mt-3 text-[30px] font-extrabold leading-none tracking-tight ${toneClass}`}
      >
        {value}
      </div>
      {caption ? (
        <div className="mt-2.5 text-[13px] leading-snug text-text-muted">{caption}</div>
      ) : null}
      {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
    </div>
  );
}

/** A labelled figure. */
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
      <div className="text-[12px] font-medium text-text-subtle">{label}</div>
      <div className={`tnum mt-1 text-xl font-bold ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-text-subtle">{hint}</div> : null}
    </div>
  );
}

// Re-exported so existing imports from this module keep working. The
// implementations live in lib/format.ts, dependency-free, so analysis engines
// can format a figure into a translated sentence without importing anything
// React-related.
export { formatIdr, formatPercent, formatSigned } from "@/lib/format";

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
  // Solid, tinted backgrounds rather than outline-only: a status pill reads
  // faster as a filled shape than as coloured text in a thin border.
  const tones: Record<BadgeTone, string> = {
    extreme: "bg-signal-extreme/12 text-signal-extreme",
    significant: "bg-signal-significant/12 text-signal-significant",
    moderate: "bg-signal-moderate/14 text-signal-moderate",
    normal: "bg-signal-normal/12 text-signal-normal",
    neutral: "bg-surface-raised text-text-muted",
    accent: "bg-accent-soft text-accent",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}
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
export function Caveats({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
      <h3 className="text-[15px] font-bold text-text">{title}</h3>
      <ul className="mt-3 grid gap-x-8 gap-y-2 lg:grid-cols-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
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
    <div className="rounded-[var(--radius)] border border-dashed border-border-strong bg-surface/60 p-10 text-center">
      <p className="text-[15px] font-bold text-text">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
        {description}
      </p>
    </div>
  );
}
