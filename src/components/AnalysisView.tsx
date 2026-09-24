import { analyzeSymbol, AnalysisError } from "@/lib/analysis/service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { AttributionBar } from "./AttributionBar";
import { DivergenceChart } from "./DivergenceChart";
import { TwinComposition } from "./TwinComposition";
import { VerdictPanel } from "./VerdictPanel";
import { KeyStatsPanel } from "./KeyStatsPanel";
import { CorporateActionsPanel } from "./CorporateActionsPanel";
import { SeasonalityPanel } from "./SeasonalityPanel";
import { SmartMoneyPanel } from "./SmartMoneyPanel";
import { Card, CardHeader, Caveats, EmptyState } from "./ui/primitives";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Server component that runs a full analysis and lays out the result.
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
  const position = await loadPosition(symbol);

  let result;
  try {
    result = await analyzeSymbol(symbol, { position, includeSmartMoney: true });
  } catch (error) {
    return <AnalysisFailure error={error} symbol={symbol} />;
  }

  const { shadow, realityCheck, notices } = result;
  const hasTwin = shadow.constituents.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">
            {result.symbol}
          </h2>
          <p className="text-sm text-text-muted">{result.companyName}</p>
        </div>
        {shadow.asOf ? (
          <p className="tnum text-xs text-text-subtle">
            {t("analysis.asOf", { date: shadow.asOf })} &middot;{" "}
            {t("analysis.sessions", { count: shadow.fitWindow })}
          </p>
        ) : null}
      </div>

      {hasTwin ? (
        <>
          <Card>
            <VerdictPanel shadow={shadow} reality={realityCheck} />
          </Card>

          <Card>
            <CardHeader
              title={t("analysis.attributionTitle")}
              description={t("analysis.attributionDescription")}
            />
            <DivergenceChart series={shadow.series} symbol={result.symbol} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={t("analysis.breakdownTitle")}
                description={t("analysis.breakdownDescription")}
              />
              <AttributionBar attribution={shadow.attribution} />
            </Card>

            <Card>
              <CardHeader
                title={t("analysis.twinTitle")}
                description={t("analysis.twinDescription")}
              />
              <TwinComposition constituents={shadow.constituents} />
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          title={t("analysis.noTwinTitle", { symbol: result.symbol })}
          description={
            shadow.warnings[0] ? tm(shadow.warnings[0]) : t("analysis.noTwinFallback")
          }
        />
      )}

      <Card>
        <CardHeader
          title={t("analysis.keyStatsTitle")}
          description={t("analysis.keyStatsDescription")}
        />
        <KeyStatsPanel stats={result.keyStats} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("analysis.actionsTitle")}
            description={t("analysis.actionsDescription")}
          />
          <CorporateActionsPanel
            items={result.corporateActions}
            upcomingIncomeIdr={result.upcomingIncomeIdr}
            hasPosition={position !== null}
          />
        </Card>

        <Card>
          <CardHeader
            title={t("analysis.seasonalityTitle")}
            description={t("analysis.seasonalityDescription")}
          />
          <SeasonalityPanel data={result.seasonality} />
        </Card>
      </div>

      {result.smartMoney ? (
        <Card>
          <CardHeader
            title={t("analysis.smartMoneyTitle")}
            description={t("analysis.smartMoneyDescription")}
          />
          <SmartMoneyPanel signal={result.smartMoney} />
        </Card>
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
