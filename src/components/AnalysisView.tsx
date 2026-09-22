import { analyzeSymbol, AnalysisError } from "@/lib/analysis/service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AttributionBar } from "./AttributionBar";
import { DivergenceChart } from "./DivergenceChart";
import { TwinComposition } from "./TwinComposition";
import { VerdictPanel } from "./VerdictPanel";
import { KeyStatsPanel } from "./KeyStatsPanel";
import { CorporateActionsPanel } from "./CorporateActionsPanel";
import { SeasonalityPanel } from "./SeasonalityPanel";
import { SmartMoneyPanel } from "./SmartMoneyPanel";
import { Card, CardHeader, Caveats, EmptyState } from "./ui/primitives";

/**
 * Server component that runs a full analysis and lays out the result.
 *
 * Errors are rendered as explanations rather than thrown, because the common
 * failure modes here are expected states, not bugs: a ticker with too little
 * history, or an exhausted credit budget. Each one deserves a specific message
 * that tells the user what to do next.
 */

export async function AnalysisView({ symbol }: { symbol: string }) {
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
            As of {shadow.asOf} &middot; {shadow.fitWindow} sessions
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
              title="Actual against its twin"
              description="Cumulative return of the stock compared with a portfolio of its closest peers."
            />
            <DivergenceChart series={shadow.series} symbol={result.symbol} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Where the move came from"
                description="The total return split into what the market, the peers, and the company itself explain."
              />
              <AttributionBar attribution={shadow.attribution} />
            </Card>

            <Card>
              <CardHeader
                title="What the twin is made of"
                description="Every peer, its weight, and why it qualified."
              />
              <TwinComposition constituents={shadow.constituents} />
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          title={`No reliable twin could be built for ${result.symbol}`}
          description={
            shadow.warnings[0] ??
            "There was not enough comparable data to construct a synthetic twin."
          }
        />
      )}

      <Card>
        <CardHeader
          title="Key statistics"
          description="Valuation, performance, and income figures for this company."
        />
        <KeyStatsPanel stats={result.keyStats} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Corporate actions"
            description="Dividends, splits, and meetings, with what each does to a holding."
          />
          <CorporateActionsPanel
            items={result.corporateActions}
            upcomingIncomeIdr={result.upcomingIncomeIdr}
            hasPosition={position !== null}
          />
        </Card>

        <Card>
          <CardHeader
            title="Seasonality"
            description="How this stock has behaved by calendar month, with the years behind each figure."
          />
          <SeasonalityPanel data={result.seasonality} />
        </Card>
      </div>

      {result.smartMoney ? (
        <Card>
          <CardHeader
            title="Smart money positioning"
            description="Whether institutional and foreign money is moving with the price or against it."
          />
          <SmartMoneyPanel signal={result.smartMoney} />
        </Card>
      ) : null}

      <Caveats items={realityCheck.caveats} />

      {notices.length > 0 ? (
        <Caveats items={notices} title="Data notes" />
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

function AnalysisFailure({ error, symbol }: { error: unknown; symbol: string }) {
  if (error instanceof AnalysisError) {
    const guidance: Record<AnalysisError["code"], string> = {
      invalid_symbol: "Check the ticker and try again.",
      no_data:
        "This ticker may be newly listed or suspended. Try a stock with a longer trading history.",
      credits_exhausted:
        "The Sectors API credit budget for this build has been spent. Cached analyses are still available.",
      upstream:
        "The Sectors API did not return data for this ticker. This is usually temporary.",
    };

    return (
      <EmptyState title={error.message} description={guidance[error.code]} />
    );
  }

  return (
    <EmptyState
      title={`Could not analyse ${symbol.toUpperCase()}`}
      description="Something went wrong while building the analysis. Try again in a moment."
    />
  );
}
