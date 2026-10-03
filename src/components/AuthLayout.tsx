import type { ReactNode } from "react";
import { getTranslator } from "@/lib/i18n/server";
import { Container } from "./ui/primitives";

/**
 * Shared frame for every auth page (sign in, sign up, verification, password
 * reset): a white form panel with a torn edge, laid over a dark scene that
 * carries the product's own picture, a stock line pulling away from its
 * twin, with the headline set large in the corner.
 *
 * The scene is drawn, not photographed: it stays on the brand palette in
 * both themes, needs no image asset, and shows what the product does rather
 * than decorating around it. Like the landing hero it is numberless and
 * labelled as an illustration, so it cannot be mistaken for live data.
 *
 * On a laptop the form sits on the left and the scene fills the card behind
 * it. On a phone the scene becomes a banner above the form, and the torn
 * edge turns to run along the top of the form instead of its side.
 */
export async function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = await getTranslator();

  return (
    <Container className="py-6 lg:py-10">
      <div className="relative mx-auto flex max-w-[1100px] flex-col overflow-hidden rounded-[var(--radius-lg)] shadow-2xl shadow-black/20 lg:min-h-[620px] lg:flex-row">
        <Scene
          labels={{
            illustration: t("landing.illustration"),
            specific: t("attribution.specific"),
            stock: t("landing.illustrationStock"),
            twin: t("chart.syntheticTwin"),
            headlineLead: t("landing.titleLead"),
            headlineAccent: t("landing.titleAccent"),
            tagline: t("brand.tagline"),
          }}
        />

        <section className="relative z-10 bg-surface lg:w-[46%]">
          {/* Torn edge: along the top on a phone, down the right side on a laptop. */}
          <TornEdge orientation="horizontal" className="absolute inset-x-0 bottom-full h-4 w-full lg:hidden" />
          <TornEdge orientation="vertical" className="absolute inset-y-0 left-full hidden h-full w-9 lg:block" />

          <div className="mx-auto flex h-full max-w-sm flex-col justify-center px-6 py-10 lg:px-2 lg:py-16">
            <h1 className="text-[30px] font-extrabold uppercase leading-tight tracking-wide text-text">
              {title}
            </h1>
            <p className="mb-8 mt-2 text-[14px] leading-relaxed text-text-muted">{subtitle}</p>
            {children}
          </div>
        </section>
      </div>
    </Container>
  );
}

/** The dark scene: a drawn chart, a label chip and the headline. */
function Scene({
  labels,
}: {
  labels: {
    illustration: string;
    specific: string;
    stock: string;
    twin: string;
    headlineLead: string;
    headlineAccent: string;
    tagline: string;
  };
}) {
  return (
    <div
      aria-hidden
      className="ink relative h-60 shrink-0 overflow-hidden lg:absolute lg:inset-0 lg:h-auto"
    >
      {/* Faint grid, the paper the chart is drawn on. */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="auth-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M56 0H0V56" fill="none" stroke="var(--border)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid)" />
      </svg>

      {/* The chart: drawn across the right of the card, behind the headline. */}
      <svg
        viewBox="0 0 640 400"
        preserveAspectRatio="xMaxYMid meet"
        className="absolute inset-y-0 right-0 h-full w-full lg:w-[62%]"
      >
        {/* The gap between the two lines is the company's own move. Flat
            colour, not a gradient, like every other orange surface. */}
        <path
          d="M0 300 L70 280 L140 292 L210 250 L280 236 L350 190 L420 172 L490 128 L560 100 L640 70 L640 214 L560 224 L490 234 L420 240 L350 236 L280 250 L210 254 L140 270 L70 266 L0 286 Z"
          style={{ fill: "var(--accent-bright)", fillOpacity: 0.13 }}
        />
        <path
          d="M0 286 L70 266 L140 270 L210 254 L280 250 L350 236 L420 240 L490 234 L560 224 L640 214"
          fill="none"
          stroke="var(--text-subtle)"
          strokeWidth="2.5"
          strokeDasharray="7 6"
        />
        <path
          d="M0 300 L70 280 L140 292 L210 250 L280 236 L350 190 L420 172 L490 128 L560 100 L640 70"
          fill="none"
          style={{ stroke: "var(--accent-bright)" }}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="560" cy="100" r="6" style={{ fill: "var(--accent-bright)" }} />
      </svg>

      <div className="absolute right-5 top-5 flex items-center gap-2 lg:right-8 lg:top-8">
        <span className="hidden items-center gap-3 rounded-full bg-surface-raised px-3 py-1 text-[11px] font-semibold text-text-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent-bright" />
            {labels.stock}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-text-subtle" />
            {labels.twin}
          </span>
        </span>
        <span className="rounded-full bg-surface-raised px-3 py-1 text-[11px] font-semibold text-text-subtle">
          {labels.illustration}
        </span>
      </div>

      <span className="absolute right-[34%] top-[30%] hidden rounded-[var(--radius-sm)] bg-accent-bright px-3.5 py-2 text-[12px] font-bold text-white lg:block">
        {labels.specific}
      </span>

      {/* Two lines, kept to the right half of the card so the headline never
          runs under the form panel. */}
      <div className="absolute bottom-6 right-5 text-right lg:bottom-12 lg:right-12 lg:max-w-[48%]">
        <p className="text-[26px] font-extrabold uppercase leading-[1.02] tracking-wide text-text lg:text-[40px]">
          <span className="block">{labels.headlineLead}</span>
          <span className="block text-accent-bright">{labels.headlineAccent}</span>
        </p>
        <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-text-muted lg:text-[15px]">
          {labels.tagline}
        </p>
      </div>
    </div>
  );
}

/**
 * Irregular offsets for the torn edge, fixed rather than random so the edge
 * renders identically on the server and in the browser.
 */
const TEAR = [
  16, 20, 13, 18, 23, 15, 11, 17, 21, 14, 19, 24, 16, 12, 18, 22, 15, 20, 13, 17, 23, 18,
  12, 16, 21, 14, 19, 25, 17, 13, 18, 22, 16, 11, 15, 20, 24, 17, 14, 19, 16,
];

/** Every other point gets a small extra notch, the fibres of a torn page. */
function tearPoints(length: number): [number, number][] {
  const step = length / (TEAR.length - 1);
  const points: [number, number][] = [];
  TEAR.forEach((depth, i) => {
    points.push([i * step, depth]);
    if (i < TEAR.length - 1) {
      const notch = i % 3 === 0 ? depth + 4 : i % 3 === 1 ? depth - 3 : depth + 1;
      points.push([i * step + step * 0.5, Math.max(6, Math.min(30, notch))]);
    }
  });
  return points;
}

/**
 * The paper edge, filled with the form panel's own surface colour so it
 * reads as part of the panel in either theme.
 */
function TornEdge({
  orientation,
  className,
}: {
  orientation: "vertical" | "horizontal";
  className: string;
}) {
  const path =
    orientation === "vertical"
      ? `M0 0 ${tearPoints(600)
          .map(([along, depth]) => `L${depth} ${along}`)
          .join(" ")} L0 600 Z`
      : `M0 40 ${tearPoints(600)
          .map(([along, depth]) => `L${along} ${40 - depth}`)
          .join(" ")} L600 40 Z`;

  return (
    <svg
      aria-hidden
      viewBox={orientation === "vertical" ? "0 0 40 600" : "0 0 600 40"}
      preserveAspectRatio="none"
      className={className}
    >
      <path d={path} fill="var(--surface)" />
    </svg>
  );
}
