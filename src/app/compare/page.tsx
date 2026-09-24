import { Suspense } from "react";
import { compareSymbols, parseSymbols } from "@/lib/analysis/compare";
import { MAX_COMPARE, MIN_COMPARE } from "@/lib/analysis/constants";
import { CompareForm } from "@/components/CompareForm";
import { ComparisonTable } from "@/components/ComparisonTable";
import { CompareSkeleton } from "@/components/CompareSkeleton";
import {
  Card,
  CardHeader,
  Caveats,
  Container,
  EmptyState,
  InkPanel,
  PageHeader,
  formatPercent,
  formatSigned,
} from "@/components/ui/primitives";
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
    <Container className="space-y-8 py-8 lg:py-10">
      <PageHeader title={t("compare.title")} description={t("compare.description")} />

      <Card>
        <CardHeader title={t("compare.formTitle")} />
        <CompareForm initialSymbols={symbols} />
      </Card>

      {symbols.length === 0 ? (
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
    </Container>
  );
}

async function ComparisonResults({ symbols }: { symbols: string[] }) {
  const [result, { t, tm }] = await Promise.all([
    compareSymbols(symbols),
    getTranslator(),
  ]);

  // The summary reads the ranking back as a sentence: who is doing the most
  // on their own, and who is simply moving with their peers. It restates the
  // table rather than adding to it.
  const [top] = result.ranked;
  const bottom = result.ranked.length > 1 ? result.ranked.at(-1) : undefined;
  const summary = top
    ? t("compare.summaryLead", {
        symbol: top.symbol,
        specific: formatPercent(top.idiosyncratic),
        z: formatSigned(top.zScore),
      }) +
      (bottom
        ? t("compare.summaryTail", { symbol: bottom.symbol, z: formatSigned(bottom.zScore) })
        : "")
    : null;

  return (
    <div className="space-y-6">
      <InkPanel>
        <h2 className="text-[18px] font-extrabold tracking-tight text-text">
          {t("compare.resultsTitle")}
        </h2>
        {summary ? (
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-muted">{summary}</p>
        ) : null}
        <div className="mt-6">
          <ComparisonTable result={result} />
        </div>
      </InkPanel>
      <Caveats items={result.caveats.map((c) => tm(c))} title={t("compare.howToRead")} />
    </div>
  );
}
