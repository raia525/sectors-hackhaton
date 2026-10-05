import { Suspense } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { TickerList, type ListParams } from "./TickerList";

export const metadata = { title: "Stocks | SHADOW IDX" };

/**
 * Stocks. Without a ticker it is the ticker list (search, watchlist
 * shortcuts, every IDX code with what is already known about it); with
 * `?symbol=` it is that stock's analysis. The symbol lives in the URL so an
 * analysis is linkable and shareable.
 */
export default async function StocksPage({ searchParams }: { searchParams: Promise<ListParams & { symbol?: string }> }) {
  const params = await searchParams;
  if (!params.symbol) return <TickerList params={params} />;

  return (
    <>
      <div className="max-w-2xl">
        <SymbolSearch initialSymbol={params.symbol} />
      </div>
      <Suspense key={params.symbol} fallback={<AnalysisSkeleton symbol={params.symbol} />}>
        <AnalysisView symbol={params.symbol} />
      </Suspense>
    </>
  );
}
