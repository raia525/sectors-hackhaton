import { Suspense } from "react";
import { compareSymbols, parseSymbols } from "@/lib/analysis/compare";
import { MAX_COMPARE, MIN_COMPARE } from "@/lib/analysis/constants";
import { CompareForm } from "@/components/CompareForm";
import { ComparisonTable } from "@/components/ComparisonTable";
import { CompareSkeleton } from "@/components/CompareSkeleton";
import { Caveats, EmptyState } from "@/components/ui/primitives";
import { getTranslator } from "@/lib/i18n/server";

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
  const { t } = await getTranslator();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {t("compare.title")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
          {t("compare.description")}
        </p>
      </div>

      <CompareForm initialSymbols={symbols} />

      <div className="mt-10">
        {symbols.length === 0 ? (
          <EmptyState
            title={t("compare.emptyTitle")}
            description={t("compare.emptyDescription", {
              min: MIN_COMPARE,
              max: MAX_COMPARE,
            })}
          />
        ) : (
          <Suspense
            key={symbols.join(",")}
            fallback={<CompareSkeleton count={symbols.length} />}
          >
            <ComparisonResults symbols={symbols} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

async function ComparisonResults({ symbols }: { symbols: string[] }) {
  const [result, { t, tm }] = await Promise.all([
    compareSymbols(symbols),
    getTranslator(),
  ]);

  return (
    <div className="space-y-4">
      <ComparisonTable result={result} />
      <Caveats items={result.caveats.map((c) => tm(c))} title={t("compare.howToRead")} />
    </div>
  );
}
