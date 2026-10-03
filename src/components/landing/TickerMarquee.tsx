import { prisma } from "@/lib/db";

/**
 * A slowly scrolling strip of real IDX tickers, where a template would put
 * partner logos. The product has no partners to show, and a row of invented
 * logos would be a claim it cannot back; the companies it covers are both
 * true and the point.
 *
 * Names come from the synced company directory. Without a database the
 * strip still runs, showing the codes alone.
 */

const FEATURED = [
  "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "UNVR", "ICBP", "INDF", "GOTO",
  "ADRO", "ANTM", "PGAS", "PTBA", "KLBF", "CPIN", "UNTR", "AMRT", "MDKA", "INCO",
  "ISAT", "BRIS",
];

export async function TickerMarquee({ label }: { label: string }) {
  const names = await loadNames();
  const items = FEATURED.map((symbol) => ({ symbol, name: names.get(symbol) ?? null }));

  return (
    <div
      role="region"
      aria-label={label}
      className="relative overflow-hidden py-7 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      {/* Two copies back to back: the track moves by exactly half its width,
          so the second copy lands where the first began and the loop is
          seamless. The copy is hidden from screen readers. */}
      <div className="marquee flex w-max">
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
                  <span className="text-[14px] font-semibold text-text-subtle">
                    {shorten(item.name)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ))}
      </div>
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

async function loadNames(): Promise<Map<string, string>> {
  try {
    const rows = await prisma.companyDirectoryEntry.findMany({
      where: { symbol: { in: FEATURED } },
      select: { symbol: true, companyName: true },
    });
    return new Map(rows.map((r) => [r.symbol, r.companyName]));
  } catch {
    return new Map();
  }
}
