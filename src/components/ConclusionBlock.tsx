import type { ConclusionTone } from "@/lib/intelligence/summary";

/**
 * The conclusion at the top of a page: one sentence to leave with, then the
 * points behind it.
 *
 * Takes already translated text so server and client pages can both use it.
 * A refusal gets the same prominence as a finding, with its own label, so
 * "we cannot say" is never visually weaker than a confident call.
 */

const TONE: Record<ConclusionTone, { bar: string; dot: string }> = {
  signal: { bar: "border-l-signal-extreme", dot: "bg-signal-extreme" },
  watch: { bar: "border-l-signal-moderate", dot: "bg-signal-moderate" },
  calm: { bar: "border-l-signal-normal", dot: "bg-signal-normal" },
  refused: { bar: "border-l-border-strong", dot: "bg-text-subtle" },
};

export function ConclusionBlock({
  label,
  toneLabel,
  tone,
  headline,
  points,
  footnote,
}: {
  label: string;
  toneLabel: string;
  tone: ConclusionTone;
  headline: string;
  points: string[];
  footnote?: string;
}) {
  const style = TONE[tone];
  return (
    <section
      aria-label={label}
      className={`rounded-[var(--radius)] border border-l-4 border-border bg-surface p-6 shadow-[var(--shadow-card)] lg:p-7 ${style.bar}`}
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-subtle">
        <span aria-hidden className={`h-2 w-2 rounded-full ${style.dot}`} />
        {label}
        <span className="text-text-subtle/80">·</span>
        <span>{toneLabel}</span>
      </p>
      <p className="mt-3 text-[19px] font-bold leading-snug tracking-tight text-text lg:text-[21px]">{headline}</p>
      {points.length > 0 ? (
        <ul className="mt-4 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
          {points.map((point, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-text-muted">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {footnote ? <p className="mt-4 border-t border-border pt-3 text-[12px] text-text-subtle">{footnote}</p> : null}
    </section>
  );
}

export const TONE_KEY = {
  signal: "conclusion.tone.signal",
  watch: "conclusion.tone.watch",
  calm: "conclusion.tone.calm",
  refused: "conclusion.tone.refused",
} as const;
