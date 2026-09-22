import { Suspense } from "react";
import { compareSymbols, parseSymbols } from "@/lib/analysis/compare";
import { MAX_COMPARE, MIN_COMPARE } from "@/lib/analysis/constants";
import { CompareForm } from "@/components/CompareForm";
import { ComparisonTable } from "@/components/ComparisonTable";
import { Caveats, EmptyState } from "@/components/ui/primitives";

export const metadata = {
  title: "Compare stocks | SHADOW IDX",
  description:
    "Compare Indonesian stocks by how far each has broken from its own synthetic twin, rather than by raw return.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const { symbols: raw } = await searchParams;
  const symbols = parseSymbols(raw);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Compare stocks
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
          Ranking by return tells you which sector did well. Ranking by
          divergence tells you which companies are doing something their peers
          are not.
        </p>
      </div>

      <CompareForm initialSymbols={symbols} />

      <div className="mt-10">
        {symbols.length === 0 ? (
          <EmptyState
            title="Add up to four tickers"
            description={`Enter ${MIN_COMPARE} to ${MAX_COMPARE} IDX tickers to compare how far each has moved from its own twin.`}
          />
        ) : (
          <Suspense key={symbols.join(",")} fallback={<CompareSkeleton count={symbols.length} />}>
            <ComparisonResults symbols={symbols} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

async function ComparisonResults({ symbols }: { symbols: string[] }) {
  const result = await compareSymbols(symbols);

  return (
    <div className="space-y-4">
      <ComparisonTable result={result} />
      <Caveats items={result.caveats} title="How to read this" />
    </div>
  );
}

function CompareSkeleton({ count }: { count: number }) {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-3">
      <p className="text-sm text-text-muted">
        Building a twin for {count} {count === 1 ? "stock" : "stocks"}. Each one
        fetches its own peer history, so this takes a moment.
      </p>
      <div className="h-56 animate-pulse rounded-[10px] border border-border bg-surface" />
    </div>
  );
}
