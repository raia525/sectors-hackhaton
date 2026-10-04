import { getTranslator } from "@/lib/i18n/server";
import { loadMarket } from "@/lib/intelligence/market";
import { formatPercent } from "@/lib/format";
import { SectorTable } from "@/components/BriefSections";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { MarketHeader } from "../MarketHeader";

export const metadata = { title: "Sectors | SHADOW IDX" };

/** Sectors: where company specific moves dominated, from the same run. */
export default async function SectorsPage() {
  const [{ t }, market] = await Promise.all([getTranslator(), loadMarket()]);
  const header = (
    <MarketHeader
      title={t("market.sectors.title")}
      description={t("market.sectors.description")}
      runDate={market?.facts.runDate}
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

  const { sectors, singleStockSectors } = market.brief;
  const [top] = sectors;
  return (
    <>
      {header}
      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={t(TONE_KEY[top ? "calm" : "refused"])}
        tone={top ? "calm" : "refused"}
        headline={
          top
            ? t("conclusion.sectors.top", {
                sector: top.sector,
                specific: formatPercent(top.avgIdio),
                count: top.count,
              })
            : t("conclusion.sectors.none")
        }
        points={
          singleStockSectors.length > 0
            ? [t("conclusion.sectors.single", { count: singleStockSectors.length })]
            : []
        }
      />
      <Card>
        <CardHeader title={t("brief.sectorTitle")} description={t("brief.sectorDescription")} />
        <SectorTable sectors={sectors} singleStockSectors={singleStockSectors} t={t} />
      </Card>
    </>
  );
}
