import { describe, expect, it } from "vitest";
import { buildCalendar } from "./calendar";
import { jakartaDate, jakartaWeekday } from "./dates";
import { msg } from "@/lib/i18n/message";
import type { CorporateActionItem } from "@/lib/analysis/corporate-actions";

function item(date: string, timing: CorporateActionItem["timing"] = "upcoming"): CorporateActionItem {
  return {
    kind: "dividend",
    timing,
    date,
    summary: msg("actions.kind.dividend"),
    effect: null,
    detail: null,
  };
}

const NOW = new Date("2026-03-02T03:00:00Z");

describe("buildCalendar", () => {
  it("keeps upcoming actions inside the window, soonest first", () => {
    const entries = buildCalendar(
      [
        { symbol: "BBRI", items: [item("2026-03-10"), item("2026-04-30")] },
        { symbol: "BBCA", items: [item("2026-03-04")] },
      ],
      NOW,
    );
    expect(entries.map((e) => `${e.symbol} ${e.item.date}`)).toEqual([
      "BBCA 2026-03-04",
      "BBRI 2026-03-10",
    ]);
  });

  it("drops past actions", () => {
    const entries = buildCalendar(
      [{ symbol: "BBRI", items: [item("2026-02-20", "recent"), item("2026-03-01")] }],
      NOW,
    );
    expect(entries).toEqual([]);
  });
});

describe("jakarta dates", () => {
  it("rolls over to the next day at 17:00 UTC", () => {
    expect(jakartaDate(new Date("2026-03-02T16:59:00Z"))).toBe("2026-03-02");
    expect(jakartaDate(new Date("2026-03-02T17:00:00Z"))).toBe("2026-03-03");
  });

  it("reports the Jakarta weekday", () => {
    // Sunday 20:00 UTC is Monday 03:00 in Jakarta.
    expect(jakartaWeekday(new Date("2026-03-01T20:00:00Z"))).toBe(1);
  });
});
