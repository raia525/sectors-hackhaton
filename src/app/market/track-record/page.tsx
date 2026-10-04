import { getTranslator } from "@/lib/i18n/server";
import { loadMarket, loadTrackRecord } from "@/lib/intelligence/market";
import { concludeTrackRecord } from "@/lib/intelligence/summary";
import { FORWARD_SESSIONS } from "@/lib/intelligence/forward";
import { TrackRecordPanel } from "@/components/BriefSections";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { CardHeader, Caveats, InkPanel } from "@/components/ui/primitives";
import { MarketHeader } from "../MarketHeader";

export const metadata = { title: "Track record | SHADOW IDX" };

/** Has the signal meant anything so far? Refuses a rate below the minimum sample. */
export default async function TrackRecordPage() {
  const [{ t, tm }, record, market] = await Promise.all([getTranslator(), loadTrackRecord(), loadMarket()]);
  const conclusion = concludeTrackRecord(record);

  return (
    <>
      <MarketHeader
        title={t("market.track.title")}
        description={t("brief.trackDescription", { sessions: FORWARD_SESSIONS })}
        runDate={market?.facts.runDate}
      />
      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={t(TONE_KEY[conclusion.tone])}
        tone={conclusion.tone}
        headline={tm(conclusion.headline)}
        points={conclusion.points.map((p) => tm(p))}
      />
      <InkPanel>
        <CardHeader title={t("brief.trackTitle")} />
        <TrackRecordPanel record={record} t={t} />
      </InkPanel>
      <Caveats
        items={[t("brief.trackCaveat1"), t("brief.trackCaveat2"), t("brief.trackCaveat3")]}
        title={t("analysis.whatThisDoesNotTellYou")}
      />
    </>
  );
}
