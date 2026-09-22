import type { DivergenceVerdict, ShadowAnalysis } from "@/lib/shadow/types";
import type { RealityCheck } from "@/lib/analysis/reality-check";
import { Badge, formatPercent, formatSigned, type BadgeTone } from "./ui/primitives";

/**
 * The headline read on a stock: how far it has broken from its twin, and
 * whether the news agrees.
 *
 * Copy is written so the number and its reliability arrive together. A large
 * divergence on a poorly fitted twin is presented as a weaker claim than the
 * same divergence on a well fitted one, because it is one.
 */

const VERDICT_COPY: Record<
  DivergenceVerdict,
  { label: string; tone: BadgeTone; meaning: string }
> = {
  extreme: {
    label: "Extreme divergence",
    tone: "extreme",
    meaning:
      "The stock has broken from its twin by more than three standard deviations. Moves this size are rare and usually have a specific cause.",
  },
  significant: {
    label: "Significant divergence",
    tone: "significant",
    meaning:
      "The stock is moving well beyond what its peers explain. Worth understanding before acting on the price.",
  },
  moderate: {
    label: "Moderate divergence",
    tone: "moderate",
    meaning:
      "There is a gap between the stock and its twin, but not beyond its usual range.",
  },
  normal: {
    label: "Within normal range",
    tone: "normal",
    meaning:
      "The stock is behaving roughly as its peers would predict. Nothing here needs explaining.",
  },
  aligned: {
    label: "Tracking its twin",
    tone: "normal",
    meaning:
      "The stock is doing what comparable companies are doing. Its move is not its own.",
  },
};

const REALITY_COPY: Record<RealityCheck["verdict"], { label: string; tone: BadgeTone }> = {
  confirmed: { label: "News and price agree", tone: "normal" },
  contradiction: { label: "News contradicts price", tone: "extreme" },
  narrative_ahead_of_price: { label: "Story ahead of the tape", tone: "significant" },
  price_ahead_of_narrative: { label: "Price ahead of the story", tone: "significant" },
  insufficient_evidence: { label: "Not enough evidence", tone: "neutral" },
};

export function VerdictPanel({
  shadow,
  reality,
}: {
  shadow: ShadowAnalysis;
  reality: RealityCheck;
}) {
  const verdict = VERDICT_COPY[shadow.verdict];
  const realityVerdict = REALITY_COPY[reality.verdict];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={verdict.tone}>{verdict.label}</Badge>
        <Badge tone={realityVerdict.tone}>{realityVerdict.label}</Badge>
        <Badge tone="neutral">{reality.confidence} confidence</Badge>
      </div>

      <p className="text-[15px] leading-relaxed text-text">{verdict.meaning}</p>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Figure
          label="Stock specific"
          value={formatPercent(shadow.attribution.idiosyncratic)}
          tone={shadow.attribution.idiosyncratic >= 0 ? "up" : "down"}
        />
        <Figure label="Divergence z score" value={formatSigned(shadow.zScore)} />
        <Figure
          label="Twin fit"
          value={`${(shadow.fitQuality * 100).toFixed(0)}%`}
          hint={shadow.fitQuality < 0.3 ? "weak" : undefined}
        />
        <Figure label="Peers used" value={String(shadow.constituents.length)} />
      </dl>

      <ul className="space-y-2">
        {reality.findings.map((finding, i) => (
          <li key={i} className="text-sm leading-relaxed text-text-muted">
            {finding}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "up" | "down";
  hint?: string;
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text";
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-text-subtle">
        {label}
      </dt>
      <dd className={`tnum mt-1 text-lg ${toneClass}`}>
        {value}
        {hint ? (
          <span className="ml-1.5 text-xs font-normal text-text-subtle">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}
