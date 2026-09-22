import type { ShadowConstituent } from "@/lib/shadow/types";

/**
 * The stocks making up the synthetic twin, with their weights and the reason
 * each one qualified.
 *
 * This panel is what separates the product from a black box. A user who
 * disagrees with a divergence figure can see exactly which companies produced
 * it and on which dimensions they matched, and dismiss the result if the peer
 * set looks wrong to them. An opaque score would have to be taken on trust.
 */

const DIMENSION_LABELS: Record<string, string> = {
  correlation: "Price correlation",
  sector: "Sub sector",
  marketCap: "Market cap",
  volatility: "Volatility",
  growth: "Growth",
  dividend: "Dividend",
};

export function TwinComposition({
  constituents,
}: {
  constituents: ShadowConstituent[];
}) {
  if (constituents.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No peer cleared the similarity threshold, so no twin was constructed.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {constituents.map((c) => (
          <li key={c.symbol}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <span className="text-sm font-medium text-text">{c.symbol}</span>
                <span className="ml-2 truncate text-xs text-text-subtle">
                  {c.companyName}
                </span>
              </div>
              <span className="tnum shrink-0 text-sm text-text-muted">
                {(c.weight * 100).toFixed(1)}%
              </span>
            </div>

            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"
              role="img"
              aria-label={`${c.symbol} carries ${(c.weight * 100).toFixed(1)} percent of the twin, with a similarity of ${(c.similarity * 100).toFixed(0)} percent.`}
            >
              <div
                aria-hidden
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(c.weight * 100, 1.5)}%` }}
              />
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-subtle">
              <span>similarity {(c.similarity * 100).toFixed(0)}%</span>
              <span>correlation {c.correlation.toFixed(2)}</span>
              {topDimensions(c).map((d) => (
                <span key={d}>{DIMENSION_LABELS[d] ?? d}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-text-subtle">
        Weights are proportional to squared similarity, then rescaled so the twin
        matches the target&apos;s volatility.
      </p>
    </div>
  );
}

/** The dimensions on which this peer matched most strongly. */
function topDimensions(c: ShadowConstituent, limit = 2): string[] {
  return Object.entries(c.components)
    .filter(([, v]) => v >= 0.7)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
