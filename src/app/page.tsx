import { Suspense } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { EmptyState } from "@/components/ui/primitives";
import { getTranslator } from "@/lib/i18n/server";

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
  const { t } = await getTranslator();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {t("home.title")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
          {t("home.description")}
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
            title={t("home.emptyTitle")}
            description={t("home.emptyDescription")}
          />
        )}
      </div>
    </div>
  );
}
