import type { ReactNode } from "react";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Market: what the daily run found across the stocks it covered. One page
 * with in-page sections (see page.tsx), so it has no sub-tabs.
 */
export default function MarketLayout({ children }: { children: ReactNode }) {
  return <Container className="space-y-6 py-8 lg:py-10">{children}</Container>;
}
