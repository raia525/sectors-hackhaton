import { analyzeSymbol, AnalysisError } from "@/lib/analysis/service";
import { AttributionBar } from "./AttributionBar";
import { DivergenceChart } from "./DivergenceChart";
import { TwinComposition } from "./TwinComposition";
import { VerdictPanel } from "./VerdictPanel";
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
  let result;
  try {
    result = await analyzeSymbol(symbol);
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

      <Caveats items={realityCheck.caveats} />

      {notices.length > 0 ? (
        <Caveats items={notices} title="Data notes" />
      ) : null}
    </div>
  );
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
