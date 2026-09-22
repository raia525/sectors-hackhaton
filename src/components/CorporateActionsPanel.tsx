import type { CorporateActionItem } from "@/lib/analysis/corporate-actions";
import { Badge, formatIdr } from "./ui/primitives";

/**
 * Corporate actions and what each one does to a holding.
 *
 * Upcoming events lead, because those are the only ones a holder can still act
 * on. When a position is known, the effect is stated in rupiah and shares
 * rather than as a yield or a ratio, since that is the form the decision
 * actually takes.
 */

export function CorporateActionsPanel({
  items,
  upcomingIncomeIdr,
  hasPosition,
}: {
  items: CorporateActionItem[];
  upcomingIncomeIdr: number | null;
  hasPosition: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No dividends, splits, or meetings on record for this stock.
      </p>
    );
  }

  const upcoming = items.filter((i) => i.timing === "upcoming");
  const recent = items.filter((i) => i.timing === "recent").slice(0, 5);

  return (
    <div className="space-y-5">
      {upcomingIncomeIdr !== null && upcomingIncomeIdr > 0 ? (
        <div className="rounded-[8px] border border-accent/30 bg-accent-soft p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-subtle">
            Due to your position
          </div>
          <div className="tnum mt-0.5 text-lg text-text">
            {formatIdr(upcomingIncomeIdr)}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            From upcoming dividends, before tax.
          </p>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
            Upcoming
          </h3>
          <ul className="space-y-2.5">
            {upcoming.map((item, i) => (
              <ActionRow key={`${item.date}-${i}`} item={item} />
            ))}
          </ul>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
            Recent
          </h3>
          <ul className="space-y-2.5">
            {recent.map((item, i) => (
              <ActionRow key={`${item.date}-${i}`} item={item} muted />
            ))}
          </ul>
        </section>
      ) : null}

      {!hasPosition ? (
        <p className="text-xs text-text-subtle">
          Add this stock to your watchlist with a position to see these effects
          in rupiah rather than as ratios.
        </p>
      ) : null}
    </div>
  );
}

function ActionRow({
  item,
  muted = false,
}: {
  item: CorporateActionItem;
  muted?: boolean;
}) {
  const tone =
    item.kind === "dividend" ? "accent" : item.kind === "stock_split" ? "moderate" : "neutral";

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm ${muted ? "text-text-muted" : "text-text"}`}>
          {item.summary}
        </span>
        <Badge tone={tone}>{item.kind.replace(/_/g, " ")}</Badge>
      </div>

      <div className="tnum mt-0.5 text-xs text-text-subtle">{item.date}</div>

      {item.effect ? (
        <div className="mt-1 text-xs text-text-muted">
          {item.effect.cashIdr !== null ? (
            <span>You receive {formatIdr(item.effect.cashIdr)} before tax.</span>
          ) : null}
          {item.effect.sharesAfter !== null &&
          item.effect.adjustedAvgPrice !== null ? (
            <span>
              Your holding becomes{" "}
              {item.effect.sharesAfter.toLocaleString("id-ID")} shares at{" "}
              {formatIdr(item.effect.adjustedAvgPrice)} each.
            </span>
          ) : null}
        </div>
      ) : null}

      {item.detail ? (
        <p className="mt-0.5 text-xs text-text-subtle">{item.detail}</p>
      ) : null}
    </li>
  );
}
