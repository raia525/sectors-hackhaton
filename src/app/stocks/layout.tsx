import type { ReactNode } from "react";
import { getTranslator } from "@/lib/i18n/server";
import { SectionTabs } from "@/components/SectionTabs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/** Stocks: every ticker and one stock in depth on the first tab, several side by side on the second. */
export default async function StocksLayout({ children }: { children: ReactNode }) {
  const { t } = await getTranslator();
  return (
    <Container className="space-y-6 py-8 lg:py-10">
      <SectionTabs
        label={t("nav.stocks")}
        items={[
          { href: "/stocks", label: t("stocks.tab.stocks") },
          { href: "/stocks/compare", label: t("stocks.tab.compare") },
        ]}
      />
      {children}
    </Container>
  );
}
