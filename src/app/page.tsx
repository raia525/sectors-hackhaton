import { Suspense } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AnalysisView } from "@/components/AnalysisView";
import { EmptyState } from "@/components/ui/primitives";

/**
 * Analysis page.
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Every stock has a shadow
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
          When a stock moves, most of that move usually belongs to the market or
          to its sector. SHADOW IDX builds a synthetic twin from comparable
          companies and shows you the part that is genuinely its own.
        </p>
      </div>

      <SymbolSearch initialSymbol={symbol} />

      <div className="mt-10">
        {symbol ? (
          <Suspense key={symbol} fallback={<AnalysisSkeleton symbol={symbol} />}>
            <AnalysisView symbol={symbol} />
          </Suspense>
        ) : (
          <EmptyState
            title="Enter a ticker to begin"
            description="Try BBRI, BBCA, TLKM, or any four letter IDX ticker. The first analysis of a stock takes a moment while its peer data is fetched."
          />
        )}
      </div>
    </div>
  );
}

function AnalysisSkeleton({ symbol }: { symbol: string }) {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-4">
      <p className="text-sm text-text-muted">
        Building the synthetic twin for {symbol.toUpperCase()}. This fetches peer
        price history, so it can take a few seconds.
      </p>
      <div className="h-64 animate-pulse rounded-[10px] border border-border bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-[10px] border border-border bg-surface" />
        <div className="h-40 animate-pulse rounded-[10px] border border-border bg-surface" />
      </div>
    </div>
  );
}
