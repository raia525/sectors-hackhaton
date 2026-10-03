import type { CSSProperties, ReactNode } from "react";
import { reveal } from "./reveal";

/**
 * The curved row of product cards under the hero headline.
 *
 * Each card previews one thing an analysis shows. Like the earlier hero
 * illustration they carry labels and shapes but no invented figures: a
 * product whose premise is not overstating evidence should not open with a
 * made-up number that reads as live data, and the row is captioned as
 * sample cards (see Landing).
 *
 * Three layers per card, so the three motions never fight over one
 * `transform`: the outer one takes the scroll reveal, the middle one its
 * fixed place on the arc, and the inner one a slow, staggered float.
 */

export interface ArcLabels {
  twin: string;
  chart: string;
  stock: string;
  twinLine: string;
  specific: string;
  significant: string;
  question: string;
  track: string;
  trackBody: string;
  news: string;
  priceAhead: string;
  smart: string;
  bullish: string;
}

export function HeroArc({ labels }: { labels: ArcLabels }) {
  const cards: { width: number; node: ReactNode; tone?: "ink" | "accent" }[] = [
    { width: 118, node: <TwinBars title={labels.twin} /> },
    { width: 150, node: <SignalCard label={labels.smart} badge={labels.bullish} bars /> },
    { width: 168, node: <ChartCard title={labels.chart} stock={labels.stock} twin={labels.twinLine} /> },
    { width: 176, tone: "ink", node: <Question text={labels.question} /> },
    { width: 160, tone: "accent", node: <TrackCard title={labels.track} body={labels.trackBody} /> },
    { width: 150, node: <SignalCard label={labels.news} badge={labels.priceAhead} /> },
    { width: 118, node: <SignalCard label={labels.specific} badge={labels.significant} compact /> },
  ];
  const middle = (cards.length - 1) / 2;

  return (
    <div aria-hidden className="relative mx-auto flex items-center justify-center [perspective:1400px]">
      {cards.map((card, i) => {
        const offset = i - middle;
        const distance = Math.abs(offset);
        const arc: CSSProperties = {
          // Further from the centre: lower, smaller, and turned to face it.
          transform: `translateY(${distance * distance * 7}px) rotateY(${-offset * 13}deg) scale(${1 - distance * 0.05})`,
        };
        const visibility =
          distance >= 3 ? "hidden lg:block" : distance >= 2 ? "hidden md:block" : "block";

        return (
          <div key={i} className={`${visibility} -mx-1.5`} {...reveal("up", 120 + distance * 110)}>
            <div style={arc}>
              <div
                className={`bob rounded-[18px] p-3.5 shadow-2xl shadow-black/30 ${
                  card.tone === "ink"
                    ? "ink border border-white/10"
                    : card.tone === "accent"
                      ? "accent-panel"
                      : "bg-white text-[#15151a]"
                }`}
                style={{ width: card.width, animationDelay: `${-i * 0.8}s` }}
              >
                {card.node}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TwinBars({ title }: { title: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold leading-tight">{title}</p>
      <div className="mt-3 space-y-2">
        {[92, 70, 52, 34].map((w, i) => (
          <div key={w} className="flex items-center gap-1.5">
            <span className={`h-4 w-4 shrink-0 rounded-full ${i === 0 ? "bg-[#ff6a1a]" : "bg-[#ececf1]"}`} />
            <span className="h-1.5 flex-1 rounded-full bg-[#ececf1]">
              <span className="block h-full rounded-full bg-[#ff6a1a]" style={{ width: `${w}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, stock, twin }: { title: string; stock: string; twin: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold leading-tight">{title}</p>
      <svg viewBox="0 0 140 70" className="mt-2 h-auto w-full">
        <path d="M0 58 L20 52 L40 55 L60 42 L80 38 L100 24 L120 18 L140 8 L140 40 L120 42 L100 45 L80 47 L60 48 L40 52 L20 50 L0 55 Z" fill="#ff6a1a" fillOpacity="0.16" />
        <path d="M0 55 L20 50 L40 52 L60 48 L80 47 L100 45 L120 42 L140 40" fill="none" stroke="#9c9ca8" strokeWidth="1.6" strokeDasharray="4 3" />
        <path d="M0 58 L20 52 L40 55 L60 42 L80 38 L100 24 L120 18 L140 8" fill="none" stroke="#ff6a1a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1.5 flex gap-2.5 text-[9px] font-semibold text-[#62626d]">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded bg-[#ff6a1a]" />
          {stock}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 border-t-2 border-dashed border-[#9c9ca8]" />
          {twin}
        </span>
      </div>
    </div>
  );
}

function Question({ text }: { text: string }) {
  return (
    <p className="text-[13px] font-bold leading-snug text-text">
      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#ff6a1a] align-middle" />
      {text}
    </p>
  );
}

function TrackCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-1 text-center">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/50 text-lg font-light">
        +
      </span>
      <p className="mt-2.5 text-[13px] font-bold leading-tight">{title}</p>
      <p className="mt-1 text-[10px] leading-snug text-text-muted">{body}</p>
    </div>
  );
}

function SignalCard({
  label,
  badge,
  bars = false,
  compact = false,
}: {
  label: string;
  badge: string;
  bars?: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold leading-tight">{label}</p>
      <span className="mt-2.5 inline-block rounded-full bg-[#fff0e6] px-2 py-1 text-[9px] font-bold leading-tight text-[#c2410c]">
        {badge}
      </span>
      {compact ? null : (
        <div className="mt-3 space-y-1.5">
          {bars ? (
            <div className="flex h-8 items-end gap-1">
              {[30, 46, 38, 62, 54, 80, 72].map((h, i) => (
                <span key={i} className="flex-1 rounded-sm bg-[#ff6a1a]" style={{ height: `${h}%`, opacity: 0.35 + i * 0.09 }} />
              ))}
            </div>
          ) : (
            [100, 82, 64].map((w) => (
              <span key={w} className="block h-1.5 rounded-full bg-[#ececf1]" style={{ width: `${w}%` }} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
