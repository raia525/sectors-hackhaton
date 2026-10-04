import { Suspense } from "react";
import { compareSymbols, parseSymbols } from "@/lib/analysis/compare";
import { MAX_COMPARE, MIN_COMPARE } from "@/lib/analysis/constants";
import { CompareForm } from "@/components/CompareForm";
import { ComparisonTable } from "@/components/ComparisonTable";
import { CompareSkeleton } from "@/components/CompareSkeleton";
import { Card, CardHeader, Caveats, EmptyState, InkPanel, PageHeader } from "@/components/ui/primitives";
import { ConclusionBlock, TONE_KEY } from "@/components/ConclusionBlock";
import { concludeCompare } from "@/lib/intelligence/summary";
import { getSignalBars } from "@/lib/settings/server";
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
    <>
      <PageHeader title={t("compare.title")} description={t("compare.description")} />

      <Card>
        <CardHeader title={t("compare.formTitle")} />
        <CompareForm initialSymbols={symbols} />
      </Card>

      {/* Below the minimum the form is only prefilled: a one stock comparison
          would spend credits and compare nothing. */}
      {symbols.length < MIN_COMPARE ? (
        <EmptyState
          title={t("compare.emptyTitle")}
          description={t("compare.emptyDescription", {
            min: MIN_COMPARE,
            max: MAX_COMPARE,
          })}
        />
      ) : (
        <Suspense key={symbols.join(",")} fallback={<CompareSkeleton count={symbols.length} />}>
          <ComparisonResults symbols={symbols} />
        </Suspense>
      )}
    </>
  );
}

async function ComparisonResults({ symbols }: { symbols: string[] }) {
  const [result, { t, tm }, bars] = await Promise.all([compareSymbols(symbols), getTranslator(), getSignalBars()]);

  // The conclusion reads the ranking back as a sentence: who is doing the
  // most on their own, and who is simply moving with their peers. Stocks
  // whose twin fits poorly are named and left out of the call.
  const conclusion = concludeCompare(result.ranked, bars);

  return (
    <div className="space-y-6">
      {conclusion ? (
        <ConclusionBlock
          label={t("conclusion.label")}
          toneLabel={t(TONE_KEY[conclusion.tone])}
          tone={conclusion.tone}
          headline={tm(conclusion.headline)}
          points={conclusion.points.map((p) => tm(p))}
        />
      ) : null}
      <InkPanel>
        <h2 className="text-[18px] font-extrabold tracking-tight text-text">{t("compare.resultsTitle")}</h2>
        <div className="mt-6">
          <ComparisonTable result={result} />
        </div>
      </InkPanel>
      <Caveats items={result.caveats.map((c) => tm(c))} title={t("compare.howToRead")} />
    </div>
  );
}
