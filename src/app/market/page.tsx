import { getTranslator } from "@/lib/i18n/server";
import { loadMarket } from "@/lib/intelligence/market";
import { concludeMarket } from "@/lib/intelligence/summary";
import { getSignalBars } from "@/lib/settings/server";
import { coverageNotes, DisagreementList, MoversTable, SmartMoneyList } from "@/components/BriefSections";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { Card, CardHeader, Caveats, EmptyState, InkPanel, StatCard } from "@/components/ui/primitives";
import { IconActivity, IconLayers, IconNews, IconWallet } from "@/components/ui/icons";
import { MarketHeader } from "./MarketHeader";

export const metadata = { title: "Market | SHADOW IDX" };

/**
 * Market summary: the conclusion first, then the movers, disagreements and
 * positioning behind it. Read from stored snapshots; never spends a credit.
 */
export default async function MarketPage() {
  const [{ t, tm }, market, bars] = await Promise.all([getTranslator(), loadMarket(), getSignalBars()]);

  if (!market) {
    return (
      <>
        <MarketHeader title={t("market.title")} description={t("market.description")} />
        <EmptyState title={t("brief.noRunTitle")} description={t("brief.noRunBody")} />
      </>
    );
  }

  const { brief, facts, skipped, failed } = market;
  const conclusion = concludeMarket(brief, facts, bars);
  const notes = coverageNotes(brief, skipped, failed, t);

  return (
    <>
      <MarketHeader title={t("market.title")} description={t("market.description")} runDate={facts.runDate} />

      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={t(TONE_KEY[conclusion.tone])}
        tone={conclusion.tone}
        headline={tm(conclusion.headline)}
        points={conclusion.points.map((p) => tm(p))}
        footnote={t("conclusion.market.footnote", { date: facts.runDate })}
      />

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
          caption={t("brief.stat.signalsCaption", { z: bars.signalZ })}
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
          value={facts.creditsSpent}
          caption={t("brief.stat.creditsCaption", { cap: facts.creditCap })}
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
          <CardHeader title={t("brief.disagreementsTitle")} description={t("brief.disagreementsDescription")} />
          <DisagreementList rows={brief.disagreements} t={t} />
        </Card>
        <Card>
          <CardHeader title={t("brief.smartMoneyTitle")} description={t("brief.smartMoneyDescription")} />
          <SmartMoneyList rows={brief.smartMoney} t={t} />
        </Card>
      </div>

      {notes.length > 0 ? <Caveats items={notes} title={t("brief.notesTitle")} /> : null}
    </>
  );
}
