import { z } from "zod";
import { corporateActionsSchema } from "@/lib/sectors/schemas";
import { msg, type Message } from "@/lib/i18n/message";
import { formatIdr } from "@/lib/format";

/**
 * Corporate actions translated into their effect on a position.
 *
 * A dividend yield of 4.2% or a 1:5 split ratio tells a holder very little on
 * its own. What they need to know is how many rupiah land in their account, on
 * what date, and how many shares they end up holding. This module does that
 * arithmetic so the interface can state the consequence rather than the ratio.
 */

export type ActionKind = "dividend" | "stock_split" | "agm";
export type ActionTiming = "upcoming" | "recent";

export interface PositionEffect {
  /** Cash the holder receives, in IDR, before tax. */
  cashIdr: number | null;
  /** Share count after the action, when it changes. */
  sharesAfter: number | null;
  /** Adjusted average cost per share, when the action changes it. */
  adjustedAvgPrice: number | null;
}

export interface CorporateActionItem {
  kind: ActionKind;
  timing: ActionTiming;
  date: string;
  /** One line stating what happens, written for a holder. */
  summary: Message;
  /** Effect on the user's position, present only when they hold the stock. */
  effect: PositionEffect | null;
  detail: Message | null;
}

export interface Position {
  /** One IDX lot is 100 shares. */
  lots: number;
  avgPrice: number;
}

/** Shares per lot on IDX. */
export const SHARES_PER_LOT = 100;

type ParsedActions = z.infer<typeof corporateActionsSchema>;

/**
 * Converts a raw corporate actions response into holder-facing items.
 *
 * `today` is injected rather than read from the clock so the upcoming and
 * recent split is deterministic under test.
 */
export function summarizeCorporateActions(
  raw: unknown,
  position: Position | null,
  today = new Date(),
): CorporateActionItem[] {
  const parsed = corporateActionsSchema.safeParse(raw);
  if (!parsed.success) return [];

  const actions: ParsedActions["corporate_actions"] = parsed.data.corporate_actions;
  const items: CorporateActionItem[] = [];
  const shares = position ? position.lots * SHARES_PER_LOT : null;

  for (const dividend of actions.dividend ?? []) {
    const date = dividend.payment_date ?? dividend.ex_date;
    if (!date) continue;

    const amount = dividend.dividend_amount;
    const cash = shares !== null && amount !== null ? shares * amount : null;

    items.push({
      kind: "dividend",
      timing: classify(date, today),
      date,
      summary:
        amount !== null
          ? msg("actions.dividendSummary", { amount: formatIdr(amount) })
          : msg("actions.dividendAnnounced"),
      effect:
        cash !== null
          ? { cashIdr: cash, sharesAfter: null, adjustedAvgPrice: null }
          : null,
      detail: dividend.ex_date
        ? msg("actions.exDateDetail", { date: dividend.ex_date })
        : null,
    });
  }

  for (const split of actions.stock_split ?? []) {
    if (!split.date || split.split_ratio === null) continue;
    const ratio = split.split_ratio;

    // A split multiplies share count and divides cost per share, leaving the
    // position's total value unchanged. Stating both halves prevents the
    // common misreading that a split creates value.
    const sharesAfter = shares !== null ? Math.floor(shares * ratio) : null;
    const adjusted =
      position && ratio > 0 ? position.avgPrice / ratio : null;

    items.push({
      kind: "stock_split",
      timing: classify(split.date, today),
      date: split.date,
      summary:
        ratio > 1
          ? msg("actions.splitSummary", { ratio })
          : msg("actions.reverseSplitSummary", { ratio: (1 / ratio).toFixed(0) }),
      effect:
        sharesAfter !== null
          ? { cashIdr: null, sharesAfter, adjustedAvgPrice: adjusted }
          : null,
      detail: msg("actions.splitDetail"),
    });
  }

  for (const agm of actions.agm ?? []) {
    if (!agm.agm_date) continue;
    items.push({
      kind: "agm",
      timing: classify(agm.agm_date, today),
      date: agm.agm_date,
      summary: msg("actions.agmSummary"),
      effect: null,
      // agm_result is free text supplied directly by the exchange filing, not
      // one of our own sentences, so it is not translatable and passes
      // through as-is rather than through the Message system.
      detail: agm.agm_result ? msg("actions.freeTextDetail", { text: agm.agm_result }) : null,
    });
  }

  // Upcoming first and soonest first, since those are the ones a holder can
  // still act on. Past events then run most recent first.
  return items.sort((a, b) => {
    if (a.timing !== b.timing) return a.timing === "upcoming" ? -1 : 1;
    return a.timing === "upcoming"
      ? a.date.localeCompare(b.date)
      : b.date.localeCompare(a.date);
  });
}

/** Total cash a position is due from upcoming dividends. */
export function upcomingIncome(items: CorporateActionItem[]): number {
  return items
    .filter((i) => i.timing === "upcoming" && i.effect?.cashIdr)
    .reduce((sum, i) => sum + (i.effect?.cashIdr ?? 0), 0);
}

function classify(date: string, today: Date): ActionTiming {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return "recent";
  return parsed >= today.getTime() ? "upcoming" : "recent";
}
