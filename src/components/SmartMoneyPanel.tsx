import type { DivergenceType, SmartMoneySignal } from "@/lib/smartmoney/types";
import { Badge, formatIdr, formatPercent, type BadgeTone } from "./ui/primitives";

/**
 * Institutional and foreign positioning against price.
 *
 * The conviction meter is labelled as scoring the strength of the observed
 * disagreement, not the odds of a future return. That distinction is the whole
 * reason the feature is defensible, so the wording carries it rather than
 * leaving a bare number to be read as a price target.
 */

const TYPE_COPY: Record<
  DivergenceType,
  { label: string; tone: BadgeTone; meaning: string }
> = {
  bullish_divergence: {
    label: "Bullish divergence",
    tone: "extreme",
    meaning:
      "The price fell while institutional and foreign money accumulated. Someone is buying what the market is selling.",
  },
  bearish_divergence: {
    label: "Bearish divergence",
    tone: "significant",
    meaning:
      "The price rose while institutional and foreign money reduced exposure. The rally is being sold into.",
  },
  confirmation_up: {
    label: "Confirmed by flow",
    tone: "normal",
    meaning:
      "Price and positioning both point up, so flow agrees with the move rather than contradicting it.",
  },
  confirmation_down: {
    label: "Confirmed by flow",
    tone: "normal",
    meaning:
      "Price and positioning both point down. The decline is backed by real outflows, not thin trading.",
  },
  no_signal: {
    label: "No divergence",
    tone: "neutral",
    meaning:
      "Positioning and price are not far enough apart to call a divergence.",
  },
};

export function SmartMoneyPanel({ signal }: { signal: SmartMoneySignal }) {
  const copy = TYPE_COPY[signal.type];

  if (signal.insufficientData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-muted">
          Not enough flow or ownership history to score positioning for this
          stock.
        </p>
        <ul className="space-y-1">
          {signal.caveats.map((c, i) => (
            <li key={i} className="text-xs text-text-subtle">
              {c}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={copy.tone}>{copy.label}</Badge>
        <Badge tone="neutral">conviction {signal.conviction}</Badge>
      </div>

      <ConvictionMeter value={signal.conviction} />

      <p className="text-[15px] leading-relaxed text-text">{copy.meaning}</p>

      <dl className="grid grid-cols-2 gap-4">
        <Figure
          label="Price over window"
          value={formatPercent(signal.priceReturn)}
          tone={signal.priceReturn >= 0 ? "up" : "down"}
        />
        <Figure
          label="Net foreign flow"
          value={formatIdr(signal.foreignFlow.netIdr)}
          tone={signal.foreignFlow.netIdr >= 0 ? "up" : "down"}
        />
        <Figure
          label="Flow intensity"
          value={formatPercent(signal.foreignFlow.intensity)}
          hint="share of traded value"
        />
        {signal.ownership ? (
          <Figure
            label="Institutional share"
            value={`${signal.ownership.shareChangePp >= 0 ? "+" : ""}${signal.ownership.shareChangePp.toFixed(2)} pp`}
            tone={signal.ownership.shareChangePp >= 0 ? "up" : "down"}
            hint={`over ${signal.ownership.months} months`}
          />
        ) : (
          <Figure label="Institutional share" value="not available" />
        )}
      </dl>

      <ul className="space-y-2">
        {signal.findings.map((finding, i) => (
          <li key={i} className="text-sm leading-relaxed text-text-muted">
            {finding}
          </li>
        ))}
      </ul>

      <ul className="space-y-1 border-t border-border pt-3">
        {signal.caveats.map((caveat, i) => (
          <li key={i} className="text-xs leading-relaxed text-text-subtle">
            {caveat}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConvictionMeter({ value }: { value: number }) {
  return (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-raised"
        role="img"
        aria-label={`Conviction ${value} out of 100. This scores how strong the observed disagreement is, not the probability of a future return.`}
      >
        <div
          aria-hidden
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-text-subtle">
        Strength of the observed disagreement, not a probability of future
        return.
      </p>
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
      <dd className={`tnum mt-0.5 text-sm ${toneClass}`}>{value}</dd>
      {hint ? <dd className="text-[11px] text-text-subtle">{hint}</dd> : null}
    </div>
  );
}
