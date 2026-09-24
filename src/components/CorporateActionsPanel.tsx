"use client";

import type { ActionKind, CorporateActionItem } from "@/lib/analysis/corporate-actions";
import { Badge, formatIdr } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Corporate actions and what each one does to a holding.
 *
 * Upcoming events lead, because those are the only ones a holder can still act
 * on. When a position is known, the effect is stated in rupiah and shares
 * rather than as a yield or a ratio, since that is the form the decision
 * actually takes.
 */

const KIND_KEY: Record<ActionKind, TranslationKey> = {
  dividend: "actions.kind.dividend",
  stock_split: "actions.kind.stockSplit",
  agm: "actions.kind.agm",
};

export function CorporateActionsPanel({
  items,
  upcomingIncomeIdr,
  hasPosition,
}: {
  items: CorporateActionItem[];
  upcomingIncomeIdr: number | null;
  hasPosition: boolean;
}) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{t("actions.noneRecorded")}</p>;
  }

  const upcoming = items.filter((i) => i.timing === "upcoming");
  const recent = items.filter((i) => i.timing === "recent").slice(0, 5);

  return (
    <div className="space-y-5">
      {upcomingIncomeIdr !== null && upcomingIncomeIdr > 0 ? (
        <div className="rounded-[8px] border border-accent/30 bg-accent-soft p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-subtle">
            {t("actions.dueToPosition")}
          </div>
          <div className="tnum mt-0.5 text-lg text-text">
            {formatIdr(upcomingIncomeIdr)}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">{t("actions.dueFootnote")}</p>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
            {t("actions.upcoming")}
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
            {t("actions.recent")}
          </h3>
          <ul className="space-y-2.5">
            {recent.map((item, i) => (
              <ActionRow key={`${item.date}-${i}`} item={item} muted />
            ))}
          </ul>
        </section>
      ) : null}

      {!hasPosition ? (
        <p className="text-xs text-text-subtle">{t("actions.noPositionHint")}</p>
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
  const { t, tm } = useTranslation();
  const tone =
    item.kind === "dividend" ? "accent" : item.kind === "stock_split" ? "moderate" : "neutral";

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm ${muted ? "text-text-muted" : "text-text"}`}>
          {tm(item.summary)}
        </span>
        <Badge tone={tone}>{t(KIND_KEY[item.kind])}</Badge>
      </div>

      <div className="tnum mt-0.5 text-xs text-text-subtle">{item.date}</div>

      {item.effect ? (
        <div className="mt-1 text-xs text-text-muted">
          {item.effect.cashIdr !== null ? (
            <span>{t("actions.receiveCash", { amount: formatIdr(item.effect.cashIdr) })}</span>
          ) : null}
          {item.effect.sharesAfter !== null &&
          item.effect.adjustedAvgPrice !== null ? (
            <span>
              {t("actions.becomesShares", {
                shares: item.effect.sharesAfter.toLocaleString("id-ID"),
                price: formatIdr(item.effect.adjustedAvgPrice),
              })}
            </span>
          ) : null}
        </div>
      ) : null}

      {item.detail ? <Detail text={tm(item.detail)} /> : null}
    </li>
  );
}

/** Characters past which a detail is collapsed behind a toggle. */
const LONG_DETAIL = 220;

/**
 * An action's detail line.
 *
 * Meeting results arrive as the exchange filing's full text, which can run to
 * several paragraphs and bury every other action in the list. Long ones are
 * collapsed to a few lines behind a native <details> toggle: nothing is
 * hidden for good, and it works with a keyboard and without extra script.
 */
function Detail({ text }: { text: string }) {
  const { t } = useTranslation();

  if (text.length <= LONG_DETAIL) {
    return <p className="mt-0.5 text-xs leading-relaxed text-text-subtle">{text}</p>;
  }

  return (
    <details className="group mt-0.5 text-xs leading-relaxed text-text-subtle">
      <summary className="cursor-pointer list-none">
        <span className="line-clamp-3 group-open:line-clamp-none">{text}</span>
        <span className="mt-1 inline-block font-semibold text-accent group-open:hidden">
          {t("actions.showMore")}
        </span>
        <span className="mt-1 hidden font-semibold text-accent group-open:inline-block">
          {t("actions.showLess")}
        </span>
      </summary>
    </details>
  );
}
