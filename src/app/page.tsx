import { Suspense } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { Landing } from "@/components/landing/Landing";
import { Container } from "@/components/ui/primitives";

/**
 * Home: the landing page, or an analysis once a ticker has been searched.
 *
 * The symbol lives in the URL rather than in component state so an analysis is
 * linkable and shareable, which matters for a tool whose output people will
 * want to send to someone else.
 */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const { symbol } = await searchParams;

  if (!symbol) return <Landing />;

  return (
    <Container className="space-y-8 py-8 lg:py-10">
      <div className="max-w-2xl">
        <SymbolSearch initialSymbol={symbol} />
      </div>
      <Suspense key={symbol} fallback={<AnalysisSkeleton symbol={symbol} />}>
        <AnalysisView symbol={symbol} />
      </Suspense>
    </Container>
  );
}
