import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { summarizeCorporateActions } from "@/lib/analysis/corporate-actions";
import { buildBrief } from "@/lib/intelligence/brief";
import { buildCalendar, CALENDAR_DAYS } from "@/lib/intelligence/calendar";
import { FORWARD_SESSIONS } from "@/lib/intelligence/forward";
import { latestRun, toBriefRow } from "@/lib/intelligence/pipeline";
import { summarizeTrackRecord, SIGNAL_Z } from "@/lib/intelligence/track-record";
import {
  CalendarList,
  coverageNotes,
  DisagreementList,
  MoversTable,
  SectorTable,
  SmartMoneyList,
  TrackRecordPanel,
} from "@/components/BriefSections";
import {
  Card,
  CardHeader,
  Caveats,
  Container,
  EmptyState,
  InkPanel,
  PageHeader,
  StatCard,
} from "@/components/ui/primitives";
import { IconActivity, IconLayers, IconNews, IconWallet } from "@/components/ui/icons";

export const metadata = { title: "Market brief | SHADOW IDX" };
export const dynamic = "force-dynamic";

/**
 * The market brief: the latest automated run, read from stored snapshots.
 *
 * Nothing here calls the Sectors API, so opening the page never spends a
 * credit. What it shows is what the daily run analysed, labelled with how
 * many stocks that was, and the limits of the track record sit next to it.
 */
export default async function BriefPage() {
  const [{ t, tm }, user, run] = await Promise.all([
    getTranslator(),
    getCurrentUser(),
    latestRun(),
  ]);

  const header = (
    <PageHeader
      title={t("brief.title")}
      description={t("brief.description")}
      actions={
        run ? (
          <span className="tnum rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted">
            {t("brief.asOf", { date: run.runDate })}
          </span>
        ) : null
      }
    />
  );

  if (!run) {
    return (
      <Container className="space-y-8 py-8 lg:py-10">
        {header}
        <EmptyState title={t("brief.noRunTitle")} description={t("brief.noRunBody")} />
      </Container>
    );
  }

  const now = new Date();
  const [snapshots, resolved] = await Promise.all([
    prisma.signalSnapshot.findMany({ where: { runDate: run.runDate } }),
    prisma.signalSnapshot.findMany({
      where: { forwardStockReturn: { not: null }, forwardTwinReturn: { not: null } },
      select: {
        zScore: true,
        fitQuality: true,
        constituentCount: true,
        forwardStockReturn: true,
        forwardTwinReturn: true,
      },
    }),
  ]);

  const brief = buildBrief(snapshots.map(toBriefRow));
  const record = summarizeTrackRecord(
    resolved.map((r) => ({
      ...r,
      forwardStockReturn: r.forwardStockReturn ?? 0,
      forwardTwinReturn: r.forwardTwinReturn ?? 0,
    })),
  );

  const done = run.items.filter((i) => i.status === "DONE").length;
  const skipped = run.items.filter((i) => i.status === "SKIPPED").map((i) => i.symbol);
  const failed = run.items.filter((i) => i.status === "FAILED").map((i) => i.symbol);
  const notes = coverageNotes(brief, skipped, failed, t);

  const calendar = user ? await userCalendar(user.id, now) : null;

  return (
    <Container className="space-y-6 py-8 lg:py-10">
      {header}

      {run.status === "ANALYSING" ? (
        <p className="rounded-[var(--radius-sm)] border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
          {t("brief.inProgress", { done, total: run.items.length })}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("brief.stat.covered")}
          value={brief.covered}
          caption={t("brief.stat.coveredCaption")}
          icon={<IconLayers />}
        />
        <StatCard
          label={t("brief.stat.signals")}
          value={brief.signalCount}
          caption={t("brief.stat.signalsCaption", { z: SIGNAL_Z })}
          icon={<IconActivity />}
        />
        <StatCard
          label={t("brief.stat.disagreements")}
          value={brief.disagreements.length}
          caption={t("brief.stat.disagreementsCaption")}
          icon={<IconNews />}
        />
        <StatCard
          label={t("brief.stat.credits")}
          value={run.creditsSpent}
          caption={t("brief.stat.creditsCaption", { cap: run.creditCap })}
          icon={<IconWallet />}
          iconTone="neutral"
        />
      </div>

      <InkPanel>
        <CardHeader title={t("brief.moversTitle")} description={t("brief.moversDescription")} />
        <MoversTable rows={brief.movers} t={t} />
      </InkPanel>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("brief.disagreementsTitle")}
            description={t("brief.disagreementsDescription")}
          />
          <DisagreementList rows={brief.disagreements} t={t} />
        </Card>
        <Card>
          <CardHeader
            title={t("brief.smartMoneyTitle")}
            description={t("brief.smartMoneyDescription")}
          />
          <SmartMoneyList rows={brief.smartMoney} t={t} />
        </Card>
      </div>

      <Card>
        <CardHeader title={t("brief.sectorTitle")} description={t("brief.sectorDescription")} />
        <SectorTable sectors={brief.sectors} singleStockSectors={brief.singleStockSectors} t={t} />
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("brief.calendarTitle", { days: CALENDAR_DAYS })}
            description={t("brief.calendarDescription")}
          />
          {calendar === null || calendar.watched === 0 ? (
            <p className="text-sm text-text-muted">{t("brief.calendarNoWatchlist")}</p>
          ) : (
            <div className="space-y-3">
              <CalendarList entries={calendar.entries} t={t} tm={tm} />
              {calendar.notCovered.length > 0 ? (
                <p className="text-xs text-text-subtle">
                  {t("brief.calendarNotCovered", { symbols: calendar.notCovered.join(", ") })}
                </p>
              ) : null}
            </div>
          )}
        </Card>

        <InkPanel>
          <CardHeader
            title={t("brief.trackTitle")}
            description={t("brief.trackDescription", { sessions: FORWARD_SESSIONS })}
          />
          <TrackRecordPanel record={record} t={t} />
        </InkPanel>
      </div>

      {notes.length > 0 ? <Caveats items={notes} title={t("brief.notesTitle")} /> : null}

      <Caveats
        items={[t("brief.trackCaveat1"), t("brief.trackCaveat2"), t("brief.trackCaveat3")]}
        title={t("analysis.whatThisDoesNotTellYou")}
      />
    </Container>
  );
}

/**
 * Upcoming corporate actions on the viewer's watchlist, with their own
 * holding's rupiah effect, from the latest stored copy for each stock.
 */
async function userCalendar(userId: string, now: Date) {
  const [items, holdings] = await Promise.all([
    prisma.watchlistItem.findMany({ where: { userId }, select: { symbol: true } }),
    prisma.holding.findMany({ where: { userId } }),
  ]);
  const symbols = items.map((i) => i.symbol);
  if (symbols.length === 0) return { watched: 0, entries: [], notCovered: [] };

  const latest = await prisma.signalSnapshot.findMany({
    where: { symbol: { in: symbols } },
    orderBy: { runDate: "desc" },
    distinct: ["symbol"],
    select: { symbol: true, corporateActions: true },
  });
  const holdingBySymbol = new Map(holdings.map((h) => [h.symbol, h]));
  const covered = new Set(latest.map((l) => l.symbol));

  const entries = buildCalendar(
    latest.map((l) => {
      const holding = holdingBySymbol.get(l.symbol);
      return {
        symbol: l.symbol,
        items: summarizeCorporateActions(
          l.corporateActions,
          holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null,
          now,
        ),
      };
    }),
    now,
  );

  return {
    watched: symbols.length,
    entries,
    notCovered: symbols.filter((s) => !covered.has(s)).sort(),
  };
}
