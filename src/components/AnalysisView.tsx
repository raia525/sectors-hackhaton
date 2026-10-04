import Link from "next/link";
import { analyzeSymbol, AnalysisError } from "@/lib/analysis/service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { AnalysisStats } from "./AnalysisStats";
import { AnalysisNarrative } from "./AnalysisNarrative";
import { AttributionHero } from "./AttributionHero";
import { DivergenceChart } from "./DivergenceChart";
import { TwinComposition } from "./TwinComposition";
import { KeyStatsPanel } from "./KeyStatsPanel";
import { CorporateActionsPanel } from "./CorporateActionsPanel";
import { SeasonalityPanel } from "./SeasonalityPanel";
import { SmartMoneyPanel } from "./SmartMoneyPanel";
import { Caveats, CollapsibleCard, EmptyState, InkPanel, PageHeader } from "./ui/primitives";
import { ConclusionBlock, TONE_KEY } from "./ConclusionBlock";
import { concludeStock } from "@/lib/intelligence/summary";
import { getSignalBars } from "@/lib/settings/server";
import { parsePreferences, type AnalysisPanel } from "@/lib/settings/user";
import type { ReactNode } from "react";
import { IconChevronLeft, IconCompare } from "./ui/icons";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Server component that runs a full analysis and lays out the result.
 *
 * Reading order, top to bottom: the conclusion, the headline figures, the
 * same result told as a story, the evidence behind it (the twin, its peers
 * and the return split, on the dark panel), then the supporting panels in
 * the order the reader chose on their account page, and the limits.
 *
 * Errors are rendered as explanations rather than thrown, because the common
 * failure modes here are expected states, not bugs: a ticker with too little
 * history, or an exhausted credit budget. Each one deserves a specific message
 * that tells the user what to do next.
 */

export async function AnalysisView({ symbol }: { symbol: string }) {
  const { t, tm } = await getTranslator();

  // A signed-in user's holding lets corporate actions be shown in rupiah. The
  // lookup is skipped entirely for anonymous visitors, who have no position.
  const [position, prefs, bars] = await Promise.all([loadPosition(symbol), loadPreferences(), getSignalBars()]);

  let result;
  try {
    result = await analyzeSymbol(symbol, { position, includeSmartMoney: true });
  } catch (error) {
    return <AnalysisFailure error={error} symbol={symbol} />;
  }

  const { shadow, realityCheck, notices } = result;
  const hasTwin = shadow.constituents.length > 0;

  const conclusion = concludeStock(
    {
      symbol: result.symbol,
      sessions: shadow.fitWindow,
      zScore: shadow.zScore,
      fitQuality: shadow.fitQuality,
      peers: shadow.constituents.length,
      total: shadow.attribution.total,
      market: shadow.attribution.market,
      sector: shadow.attribution.sector,
      idio: shadow.attribution.idiosyncratic,
      realityVerdict: realityCheck.verdict,
      upcoming: result.corporateActions
        .filter((a) => a.timing === "upcoming")
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((a) => ({ kind: a.kind, date: a.date })),
    },
    bars,
  );

  const panels: Record<AnalysisPanel, ReactNode> = {
    keyStats: (
      <CollapsibleCard title={t("analysis.keyStatsTitle")} description={t("analysis.keyStatsDescription")}>
        <KeyStatsPanel stats={result.keyStats} />
      </CollapsibleCard>
    ),
    corporateActions: (
      <CollapsibleCard title={t("analysis.actionsTitle")} description={t("analysis.actionsDescription")}>
        <CorporateActionsPanel
          items={result.corporateActions}
          upcomingIncomeIdr={result.upcomingIncomeIdr}
          hasPosition={position !== null}
        />
      </CollapsibleCard>
    ),
    seasonality: (
      <CollapsibleCard title={t("analysis.seasonalityTitle")} description={t("analysis.seasonalityDescription")}>
        <SeasonalityPanel data={result.seasonality} />
      </CollapsibleCard>
    ),
    smartMoney: result.smartMoney ? (
      <CollapsibleCard title={t("analysis.smartMoneyTitle")} description={t("analysis.smartMoneyDescription")}>
        <SmartMoneyPanel signal={result.smartMoney} />
      </CollapsibleCard>
    ) : null,
  };
  const hiddenCount = 4 - prefs.panels.length;

  // The compare page takes up to four symbols: this stock plus its three
  // heaviest peers is the most natural comparison to offer.
  const peers = [...shadow.constituents]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => c.symbol);
  const compareHref = `/stocks/compare?symbols=${[result.symbol, ...peers].join(",")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        back={
          <Link
            href="/"
            aria-label={t("analysis.back")}
            className="mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-[var(--shadow-card)] transition-colors hover:text-text"
          >
            <IconChevronLeft />
          </Link>
        }
        title={result.symbol}
        description={result.companyName}
        actions={
          <>
            {shadow.asOf ? (
              <span className="tnum rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted">
                {t("analysis.asOf", { date: shadow.asOf })} &middot;{" "}
                {t("analysis.sessions", { count: shadow.fitWindow })}
              </span>
            ) : null}
            {hasTwin ? (
              <Link
                href={compareHref}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-contrast shadow-[var(--shadow-card)] transition-colors hover:bg-accent-hover"
              >
                <IconCompare size={16} />
                {t("analysis.compareCta")}
              </Link>
            ) : null}
          </>
        }
      />

      <ConclusionBlock
        label={t("conclusion.label")}
        toneLabel={t(TONE_KEY[conclusion.tone])}
        tone={conclusion.tone}
        headline={tm(conclusion.headline)}
        points={conclusion.points.map((p) => tm(p))}
      />

      {hasTwin ? (
        <>
          <AnalysisStats shadow={shadow} reality={realityCheck} />

          <AnalysisNarrative
            symbol={result.symbol}
            shadow={shadow}
            reality={realityCheck}
            smartMoney={result.smartMoney}
          />

          <InkPanel>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-extrabold tracking-tight text-text">
                  {t("analysis.attributionTitle")}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {t("analysis.attributionDescription")}
                </p>
              </div>
            </div>

            <DivergenceChart series={shadow.series} symbol={result.symbol} />

            <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
              <div>
                <h3 className="text-[16px] font-bold text-text">{t("analysis.twinTitle")}</h3>
                <p className="mb-4 mt-1 text-sm text-text-muted">
                  {t("analysis.twinDescription")}
                </p>
                <TwinComposition constituents={shadow.constituents} />
              </div>
              <AttributionHero
                attribution={shadow.attribution}
                zScore={shadow.zScore}
                fitQuality={shadow.fitQuality}
                sessions={shadow.fitWindow}
                trackHref="/portfolio"
              />
            </div>
          </InkPanel>
        </>
      ) : (
        <EmptyState
          title={t("analysis.noTwinTitle", { symbol: result.symbol })}
          description={
            shadow.warnings[0] ? tm(shadow.warnings[0]) : t("analysis.noTwinFallback")
          }
        />
      )}

      {prefs.panels.map((panel) => (panels[panel] ? <div key={panel}>{panels[panel]}</div> : null))}

      {hiddenCount > 0 ? (
        <p className="text-sm text-text-muted">
          {t("analysis.panelsHidden", { count: hiddenCount })}{" "}
          <Link href="/account#layout" className="font-semibold text-accent hover:underline">
            {t("analysis.panelsChange")}
          </Link>
        </p>
      ) : null}

      <Caveats
        items={realityCheck.caveats.map((c) => tm(c))}
        title={t("analysis.whatThisDoesNotTellYou")}
      />

      {notices.length > 0 ? (
        <Caveats items={notices.map((n) => tm(n))} title={t("analysis.dataNotes")} />
      ) : null}
    </div>
  );
}

/** The reader's panel layout; the default layout when signed out or on error. */
async function loadPreferences() {
  try {
    const user = await getCurrentUser();
    if (!user) return parsePreferences(null);
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { preferences: true } });
    return parsePreferences(row?.preferences);
  } catch {
    return parsePreferences(null);
  }
}

/**
 * Loads the signed-in user's position in this stock, when there is one.
 *
 * Failures are swallowed: the database is optional in local setups, and an
 * absent position only means corporate actions are shown as ratios rather than
 * rupiah, which is not worth failing the page over.
 */
async function loadPosition(
  symbol: string,
): Promise<{ lots: number; avgPrice: number } | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const holding = await prisma.holding.findUnique({
      where: { userId_symbol: { userId: user.id, symbol: symbol.toUpperCase() } },
    });
    return holding ? { lots: holding.lots, avgPrice: holding.avgPrice } : null;
  } catch {
    return null;
  }
}

async function AnalysisFailure({ error, symbol }: { error: unknown; symbol: string }) {
  const { t } = await getTranslator();

  if (error instanceof AnalysisError) {
    const guidanceKey: Record<AnalysisError["code"], TranslationKey> = {
      invalid_symbol: "analysis.error.invalidSymbol",
      no_data: "analysis.error.noData",
      credits_exhausted: "analysis.error.creditsExhausted",
      upstream: "analysis.error.upstream",
    };

    // The title names the ticker and that analysis failed; the wording for
    // each failure kind is translated rather than reusing the raw
    // Error.message, which is written for logs, not for a viewer.
    return (
      <EmptyState
        title={t("analysis.error.genericTitle", { symbol: symbol.toUpperCase() })}
        description={t(guidanceKey[error.code])}
      />
    );
  }

  return (
    <EmptyState
      title={t("analysis.error.genericTitle", { symbol: symbol.toUpperCase() })}
      description={t("analysis.error.generic")}
    />
  );
}
