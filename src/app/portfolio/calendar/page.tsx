import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { CALENDAR_DAYS } from "@/lib/intelligence/calendar";
import { loadPortfolio } from "@/lib/intelligence/portfolio";
import { formatIdr } from "@/lib/format";
import { CalendarList } from "@/components/BriefSections";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Calendar | SHADOW IDX" };

/**
 * Upcoming corporate actions on the user's watchlist, with the rupiah effect
 * on their own holding, from the latest stored copy of each stock.
 */
export default async function CalendarPage() {
  const [user, { t, tm }] = await Promise.all([getCurrentUser(), getTranslator()]);
  if (!user) redirect("/signin?next=/portfolio/calendar");

  const { calendar, notCovered, facts } = await loadPortfolio(user.id);
  const tone = facts.watched === 0 ? "refused" : calendar.length > 0 ? "watch" : "calm";

  return (
    <>
      <PageHeader
        title={t("brief.calendarTitle", { days: CALENDAR_DAYS })}
        description={t("brief.calendarDescription")}
      />
      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={t(TONE_KEY[tone])}
        tone={tone}
        headline={
          facts.watched === 0
            ? t("brief.calendarNoWatchlist")
            : calendar.length === 0
              ? t("conclusion.calendar.none", { days: CALENDAR_DAYS })
              : facts.upcomingIncome > 0
                ? t("conclusion.calendar.income", {
                    count: calendar.length,
                    days: CALENDAR_DAYS,
                    amount: formatIdr(facts.upcomingIncome),
                  })
                : t("conclusion.calendar.some", { count: calendar.length, days: CALENDAR_DAYS })
        }
        points={notCovered.length > 0 ? [t("brief.calendarNotCovered", { symbols: notCovered.join(", ") })] : []}
      />
      {facts.watched > 0 ? (
        <Card>
          <CalendarList entries={calendar} t={t} tm={tm} />
        </Card>
      ) : null}
    </>
  );
}
