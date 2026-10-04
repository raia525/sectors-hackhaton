import type { ReactNode } from "react";
import { getTranslator } from "@/lib/i18n/server";
import { SectionTabs } from "@/components/SectionTabs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/** Market: what the daily run found across the stocks it covered. */
export default async function MarketLayout({ children }: { children: ReactNode }) {
  const { t } = await getTranslator();
  return (
    <Container className="space-y-6 py-8 lg:py-10">
      <SectionTabs
        label={t("nav.market")}
        items={[
          { href: "/market", label: t("market.tab.summary") },
          { href: "/market/sectors", label: t("market.tab.sectors") },
          { href: "/market/track-record", label: t("market.tab.track") },
        ]}
      />
      {children}
    </Container>
  );
}
