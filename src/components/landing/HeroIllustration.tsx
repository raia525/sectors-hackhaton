import { delay, reveal } from "./reveal";

/**
 * The landing page hero visual: a stock line pulling away from its twin, and
 * the move split into three parts.
 *
 * Deliberately numberless and labelled as an illustration. A product whose
 * whole premise is not overstating evidence should not open with an invented
 * figure that a visitor could mistake for live data.
 *
 * Each time it scrolls into view the story replays in order: the twin
 * appears, the stock line draws away from it, the gap between them fills in,
 * then the split below grows.
 */
export function HeroIllustration({
  labels,
}: {
  labels: {
    illustration: string;
    stock: string;
    twin: string;
    market: string;
    peers: string;
    specific: string;
  };
}) {
  return (
    <div className="relative" {...reveal("zoom", 150)}>
      <div className="ink rounded-[var(--radius-lg)] border border-border p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-semibold text-text-muted">
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-5 rounded bg-[#fb7a2e]" />
              {labels.stock}
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-0.5 w-5 rounded"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, var(--text-subtle) 0 4px, transparent 4px 7px)",
                }}
              />
              {labels.twin}
            </span>
          </div>
          <span className="rounded-full bg-surface-raised px-3 py-1 text-[11px] font-semibold text-text-subtle">
            {labels.illustration}
          </span>
        </div>

        <svg viewBox="0 0 480 220" className="mt-5 h-auto w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="hero-band" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fb7a2e" stopOpacity="0.32" />
              <stop offset="1" stopColor="#fb7a2e" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[40, 95, 150, 205].map((y) => (
            <line key={y} x1="0" x2="480" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
          ))}
          {/* The band between the two lines: the part of the move that is the company's own. */}
          <path
            className="reveal-fade"
            style={delay(1100)}
            d="M0 170 L60 150 L120 158 L180 128 L240 118 L300 84 L360 70 L420 44 L480 34 L480 112 L420 118 L360 126 L300 122 L240 132 L180 134 L120 150 L60 146 L0 162 Z"
            fill="url(#hero-band)"
          />
          <path
            className="reveal-fade"
            style={delay(200)}
            d="M0 162 L60 146 L120 150 L180 134 L240 132 L300 122 L360 126 L420 118 L480 112"
            fill="none"
            stroke="var(--text-subtle)"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          {/* pathLength="1" lets a single dash of length 1 cover the whole line,
              so sliding its offset from 1 to 0 draws it from left to right. */}
          <path
            className="reveal-draw"
            style={delay(450)}
            pathLength={1}
            strokeDasharray="1"
            d="M0 170 L60 150 L120 158 L180 128 L240 118 L300 84 L360 70 L420 44 L480 34"
            fill="none"
            stroke="#fb7a2e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g className="reveal-pop" style={delay(1700)}>
            <circle className="ping-ring" cx="480" cy="34" r="5" fill="#fb7a2e" />
            <circle cx="480" cy="34" r="5" fill="#fb7a2e" />
          </g>
        </svg>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Segment label={labels.market} width={62} delayMs={1300} />
          <Segment label={labels.peers} width={38} delayMs={1450} />
          <Segment label={labels.specific} width={84} delayMs={1600} emphasis />
        </div>
      </div>

      {/* A floating accent chip echoing the product's key output. */}
      <div className="bob accent-panel absolute -left-6 top-24 hidden rounded-[var(--radius-sm)] px-4 py-3 shadow-xl shadow-orange-900/25 lg:block">
        <div className="text-[11px] font-semibold text-text-muted">{labels.specific}</div>
        <div className="mt-1.5 flex h-7 items-end gap-1" aria-hidden>
          {[10, 16, 12, 22, 18, 28].map((h, i) => (
            <span
              key={i}
              className="reveal-grow-y w-2 rounded-sm bg-white/85"
              style={{ height: `${h}px`, ...delay(700 + i * 90) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Segment({
  label,
  width,
  delayMs,
  emphasis = false,
}: {
  label: string;
  width: number;
  delayMs: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-sm)] p-3 ${emphasis ? "accent-panel" : "bg-surface-raised"}`}
    >
      <div className="truncate text-[11px] font-semibold text-text-muted">{label}</div>
      <div className="mt-2.5 h-1.5 rounded-full bg-surface">
        <div
          className="reveal-grow h-full rounded-full bg-accent"
          style={{ width: `${width}%`, ...delay(delayMs) }}
        />
      </div>
    </div>
  );
}
