import Link from "next/link";
import { Suspense } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Analyse | SHADOW IDX" };

/**
 * Analyse. With no ticker it is the search and shortcuts to watched stocks;
 * with `?symbol=` it is the analysis. The symbol lives in the URL so an
 * analysis is linkable and shareable.
 */
export default async function StocksPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const [{ symbol }, userId] = await Promise.all([searchParams, getSessionUserId()]);
  if (!symbol) return <AnalyseStart userId={userId} />;

  return (
    <>
      <div className="max-w-2xl">
        <SymbolSearch initialSymbol={symbol} />
      </div>
      <Suspense key={symbol} fallback={<AnalysisSkeleton symbol={symbol} />}>
        <AnalysisView symbol={symbol} />
      </Suspense>
    </>
  );
}

/** Before a ticker is chosen: the search, and shortcuts to watched stocks. */
async function AnalyseStart({ userId }: { userId: string | null }) {
  const { t } = await getTranslator();
  const watched = userId
    ? await prisma.watchlistItem
        .findMany({ where: { userId }, select: { symbol: true }, orderBy: { createdAt: "desc" }, take: 8 })
        .catch(() => [])
    : [];

  return (
    <div className="mx-auto max-w-2xl py-6 lg:py-12">
      <h1 className="text-center text-[34px] font-extrabold leading-tight tracking-tight text-text lg:text-[42px]">
        {t("home.emptyTitle")}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed text-text-muted">
        {t("home.emptyDescription")}
      </p>
      <div className="mt-8">
        <SymbolSearch />
      </div>

      {watched.length > 0 ? (
        <div className="mt-10">
          <p className="text-[12px] font-bold uppercase tracking-wider text-text-subtle">{t("analyse.fromWatchlist")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {watched.map((w) => (
              <li key={w.symbol}>
                <Link
                  href={`/stocks?symbol=${w.symbol}`}
                  className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-text transition-colors hover:border-accent hover:text-accent"
                >
                  {w.symbol}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-10 text-center text-sm text-text-muted">
        <Link href="/stocks/list" className="font-semibold text-accent hover:underline">
          {t("stocks.browseAll")}
        </Link>
      </p>
    </div>
  );
}
