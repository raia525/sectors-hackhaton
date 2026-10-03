import Link from "next/link";
import { Suspense } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalysisSkeleton } from "@/components/AnalysisSkeleton";
import { Landing } from "@/components/landing/Landing";
import { Container } from "@/components/ui/primitives";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";

/**
 * `/` serves two different pages, chosen by whether there is a session:
 *
 * - Signed out: the landing page, and nothing else. Analysis needs an
 *   account (see src/proxy.ts), so the landing page has no search box.
 * - Signed in: the Analyse page. With no ticker yet it is only the search
 *   and the stocks already on the watchlist; with `?symbol=` it is the
 *   analysis. No landing content appears here.
 *
 * The symbol lives in the URL rather than in component state so an analysis
 * is linkable and shareable.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const [{ symbol }, userId] = await Promise.all([searchParams, getSessionUserId()]);

  if (!userId) return <Landing />;
  if (!symbol) return <AnalyseStart userId={userId} />;

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

/** The Analyse page before a ticker is chosen: the search, and shortcuts to watched stocks. */
async function AnalyseStart({ userId }: { userId: string }) {
  const { t } = await getTranslator();
  const watched = await prisma.watchlistItem
    .findMany({
      where: { userId },
      select: { symbol: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    })
    .catch(() => []);

  return (
    <Container className="py-12 lg:py-20">
      <div className="mx-auto max-w-2xl">
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
            <p className="text-[12px] font-bold uppercase tracking-wider text-text-subtle">
              {t("analyse.fromWatchlist")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {watched.map((w) => (
                <li key={w.symbol}>
                  <Link
                    href={`/?symbol=${w.symbol}`}
                    className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-text transition-colors hover:border-accent hover:text-accent"
                  >
                    {w.symbol}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
