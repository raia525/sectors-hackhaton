import { getTranslator } from "@/lib/i18n/server";
import { formatPercent } from "@/lib/format";
import { FORWARD_SESSIONS } from "@/lib/intelligence/forward";
import { loadMarket, loadTrackRecord } from "@/lib/intelligence/market";
import { concludeMarket, concludeTrackRecord } from "@/lib/intelligence/summary";
import { getSignalBars } from "@/lib/settings/server";
import {
  coverageNotes,
  DisagreementList,
  MoversTable,
  SectorTable,
  SmartMoneyList,
  TrackRecordPanel,
} from "@/components/BriefSections";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { Card, CardHeader, Caveats, EmptyState, InkPanel, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Market | SHADOW IDX" };

/**
 * Market: one page, read top to bottom. The conclusion first, then the
 * evidence behind it (movers, news against price, positioning), then the
 * sector view and the track record as sections of the same page rather
 * than separate tabs, since each is a single card. Read from stored
 * snapshots; opening it never spends a credit.
 */
export default async function MarketPage() {
  const [{ t, tm }, market, bars, record] = await Promise.all([
    getTranslator(),
    loadMarket(),
    getSignalBars(),
    loadTrackRecord(),
  ]);

  const header = (
    <PageHeader
      title={t("market.title")}
      description={t("market.description")}
      actions={
        market ? (
          <span className="tnum rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted">
            {t("brief.asOf", { date: market.facts.runDate })}
          </span>
        ) : null
      }
    />
  );

  if (!market) {
    return (
      <>
        {header}
        <EmptyState title={t("brief.noRunTitle")} description={t("brief.noRunBody")} />
      </>
    );
  }

  const { brief, facts, skipped, failed } = market;
  const conclusion = concludeMarket(brief, facts, bars);
  const notes = coverageNotes(brief, skipped, failed, t);
  const [topSector] = brief.sectors;
  const track = concludeTrackRecord(record);

  const sections = [
    { id: "summary", label: t("market.tab.summary") },
    { id: "sectors", label: t("market.tab.sectors") },
    { id: "track-record", label: t("market.tab.track") },
  ];

  return (
    <>
      {header}

      <nav aria-label={t("market.sectionsLabel")} className="-mt-2 flex flex-wrap gap-1">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section id="summary" className="scroll-mt-24 space-y-6">
        <ConclusionBlock
          label={t("conclusion.label")}
          toneLabel={t(TONE_KEY[conclusion.tone])}
          tone={conclusion.tone}
          headline={tm(conclusion.headline)}
          points={conclusion.points.map((p) => tm(p))}
          footnote={t("conclusion.market.footnote", { date: facts.runDate })}
        />

        <InkPanel>
          <CardHeader title={t("brief.moversTitle")} description={t("brief.moversDescription")} />
          <MoversTable rows={brief.movers} t={t} />
        </InkPanel>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={t("brief.disagreementsTitle")} description={t("brief.disagreementsDescription")} />
            <DisagreementList rows={brief.disagreements} t={t} />
          </Card>
          <Card>
            <CardHeader title={t("brief.smartMoneyTitle")} description={t("brief.smartMoneyDescription")} />
            <SmartMoneyList rows={brief.smartMoney} t={t} />
          </Card>
        </div>

        {notes.length > 0 ? <Caveats items={notes} title={t("brief.notesTitle")} /> : null}
      </section>

      <section id="sectors" className="scroll-mt-24">
        <Card>
          <CardHeader title={t("market.sectors.title")} description={t("market.sectors.description")} />
          <p className="mb-5 text-[15px] font-semibold leading-relaxed text-text">
            {topSector
              ? t("conclusion.sectors.top", {
                  sector: topSector.sector,
                  specific: formatPercent(topSector.avgIdio),
                  count: topSector.count,
                })
              : t("conclusion.sectors.none")}
          </p>
          <SectorTable sectors={brief.sectors} singleStockSectors={brief.singleStockSectors} t={t} />
        </Card>
      </section>

      <section id="track-record" className="scroll-mt-24 space-y-6">
        <InkPanel>
          <CardHeader
            title={t("market.track.title")}
            description={t("brief.trackDescription", { sessions: FORWARD_SESSIONS })}
          />
          <p className="mb-5 text-[15px] font-semibold leading-relaxed text-text">{tm(track.headline)}</p>
          {track.points.length > 0 ? (
            <p className="-mt-3 mb-5 text-sm text-text-muted">{track.points.map((p) => tm(p)).join(" ")}</p>
          ) : null}
          <TrackRecordPanel record={record} t={t} />
        </InkPanel>
        <Caveats
          items={[t("brief.trackCaveat1"), t("brief.trackCaveat2"), t("brief.trackCaveat3")]}
          title={t("analysis.whatThisDoesNotTellYou")}
        />
      </section>
    </>
  );
}
