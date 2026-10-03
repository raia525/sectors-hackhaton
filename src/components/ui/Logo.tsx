"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The SHADOW IDX mark: an eclipse.
 *
 * A bright disc, the stock, with its shadow drawn over it. The shadow is
 * outlined in dashes, the way the synthetic twin is drawn in every chart,
 * and it covers most of the disc: most of any move belongs to the market and
 * the stock's peers. What stays lit is a crescent, the part of the move that
 * is the company's own, and the one thing this product exists to find.
 * What shines past its shadow is its own.
 *
 * The disc takes the active palette's accent (`--accent-bright`), so a
 * palette change in the admin panel recolours the mark too. The tile is a
 * fixed near-black, so the mark reads on light pages and dark panels alike.
 */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="40" height="40" rx="12" fill="#15151a" />
      {/* The stock. */}
      <circle cx="22.5" cy="17.5" r="10" style={{ fill: "var(--accent-bright, #ff6a1a)" }} />
      {/* Its shadow, the twin: covers most of the disc, leaving a crescent. */}
      <circle cx="17.5" cy="22.5" r="10" fill="#15151a" />
      <circle
        cx="17.5"
        cy="22.5"
        r="10"
        strokeWidth="1.6"
        strokeDasharray="2.2 2.6"
        strokeLinecap="round"
        style={{ stroke: "var(--accent-bright, #ff6a1a)", strokeOpacity: 0.45 }}
      />
    </svg>
  );
}

const BrandContext = createContext<{ logoUrl: string | null }>({ logoUrl: null });

/** Carries the admin-uploaded logo, if any, to every place the mark is drawn. */
export function BrandProvider({ logoUrl, children }: { logoUrl: string | null; children: ReactNode }) {
  return <BrandContext.Provider value={{ logoUrl }}>{children}</BrandContext.Provider>;
}

/**
 * The mark as the site shows it: the uploaded logo when an admin has set
 * one, otherwise the built-in eclipse. An upload replaces the symbol only;
 * the name beside it stays as text, so it remains readable and translatable.
 */
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const { logoUrl } = useContext(BrandContext);
  if (logoUrl) {
    return (
      // A plain img: an admin upload has unknown dimensions and may be SVG,
      // which next/image does not optimise anyway.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        height={size}
        style={{ height: size, width: "auto", maxWidth: size * 3 }}
        className={`rounded-[10px] object-contain ${className}`}
      />
    );
  }
  return <LogoMark size={size} className={className} />;
}

/** Mark plus wordmark and tagline. */
export function Logo({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={38} />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-extrabold tracking-tight text-text">
          SHADOW <span className="font-medium text-text-muted">IDX</span>
        </span>
        {tagline ? (
          <span className="mt-1 text-[11px] font-medium text-text-subtle">{tagline}</span>
        ) : null}
      </span>
    </span>
  );
}
