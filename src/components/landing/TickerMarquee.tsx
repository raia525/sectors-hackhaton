import { prisma } from "@/lib/db";
import { DEFAULT_STRIP } from "@/lib/admin/symbols";
import { formatPercent } from "@/lib/format";
import { getAppSettings } from "@/lib/settings/server";
import { STRIP_SECONDS } from "@/lib/settings/app";

/**
 * A slowly scrolling strip of real IDX tickers, where a template would put
 * partner logos. The product has no partners to show, and a row of invented
 * logos would be a claim it cannot back; the companies it covers are both
 * true and the point.
 *
 * The list, its speed, and whether names and the latest move show are set
 * in Admin > Ticker strip and Admin > Settings. With no list set, the
 * built-in one is used. The latest move comes from stored analyses, never
 * a live request, so the landing page costs no credit; a stock the daily
 * run has not covered simply shows no move. Without a database the strip
 * still runs, showing the codes alone.
 */

export async function TickerMarquee({ label, moveCaption }: { label: string; moveCaption: (date: string) => string }) {
  const [{ strip }, data] = await Promise.all([getAppSettings(), loadStrip()]);
  const items = data.symbols.map((symbol) => ({
    symbol,
    name: strip.showNames ? (data.names.get(symbol) ?? null) : null,
    move: strip.showMove ? (data.moves.get(symbol) ?? null) : null,
  }));
  if (items.length === 0) return null;
  // The move is the stock's return over its last analysis window, not
  // today's change, so the strip says so whenever it shows one.
  const showCaption = strip.showMove && data.asOf !== null;

  return (
    <div>
    <div
      role="region"
      aria-label={label}
      className="relative overflow-hidden py-7 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      {/* Two copies back to back: the track moves by exactly half its width,
          so the second copy lands where the first began and the loop is
          seamless. The copy is hidden from screen readers. */}
      <div className="marquee flex w-max" style={{ animationDuration: `${STRIP_SECONDS[strip.speed]}s` }}>
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1 || undefined}
            // Trailing padding equal to the gap, so the seam between the two
            // copies is spaced exactly like every other pair of items.
            className="flex shrink-0 items-center gap-10 pr-10"
          >
            {items.map((item) => (
              <li key={item.symbol} className="flex items-center gap-2.5 whitespace-nowrap">
                <span className="rounded-md bg-surface-raised px-2 py-1 text-[13px] font-extrabold tracking-wide text-text">
                  {item.symbol}
                </span>
                {item.name ? (
                  <span className="text-[14px] font-semibold text-text-subtle">{shorten(item.name)}</span>
                ) : null}
                {item.move !== null ? (
                  <span className={`tnum text-[13px] font-bold ${item.move >= 0 ? "text-up" : "text-down"}`}>
                    {formatPercent(item.move, 1)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
      {showCaption ? (
        <p className="-mt-3 pb-3 text-center text-[12px] text-text-subtle">{moveCaption(data.asOf ?? "")}</p>
      ) : null}
    </div>
  );
}

/** Drops the legal suffixes that make every name read the same. */
function shorten(name: string): string {
  return name
    .replace(/\s*\(Persero\)\s*/i, " ")
    .replace(/^PT\.?\s+/i, "")
    .replace(/\s+Tbk\.?$/i, "")
    .trim();
}

async function loadStrip(): Promise<{
  symbols: string[];
  names: Map<string, string>;
  moves: Map<string, number>;
  asOf: string | null;
}> {
  try {
    const managed = await prisma.tickerStripItem.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { symbol: true },
    });
    const symbols = managed.length > 0 ? managed.map((m) => m.symbol) : DEFAULT_STRIP;
    const [rows, snapshots] = await Promise.all([
      prisma.companyDirectoryEntry.findMany({
        where: { symbol: { in: symbols } },
        select: { symbol: true, companyName: true },
      }),
      prisma.signalSnapshot.findMany({
        where: { symbol: { in: symbols } },
        orderBy: { runDate: "desc" },
        distinct: ["symbol"],
        select: { symbol: true, totalReturn: true, runDate: true },
      }),
    ]);
    return {
      symbols,
      names: new Map(rows.map((r) => [r.symbol, r.companyName])),
      moves: new Map(snapshots.map((s) => [s.symbol, s.totalReturn])),
      asOf: snapshots.reduce<string | null>((max, s) => (max === null || s.runDate > max ? s.runDate : max), null),
    };
  } catch {
    return { symbols: DEFAULT_STRIP, names: new Map(), moves: new Map(), asOf: null };
  }
}
