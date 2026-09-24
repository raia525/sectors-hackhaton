/**
 * SHADOW IDX mark.
 *
 * The product in one glyph: a solid line (the stock) running above a dashed
 * line (its synthetic twin), with the gap between them being the part of the
 * move that belongs to the company alone. Drawn in white on the brand orange
 * so it reads at 16px in a browser tab as well as in the header.
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
      <rect width="40" height="40" rx="12" fill="#EA580C" />
      <path
        d="M8 26.5 L14.5 21 L19.5 24 L26 15.5 L32 18"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2.6 3"
      />
      <path
        d="M8 23 L14.5 16.5 L19.5 19.5 L26 10 L32 12.5"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="12.5" r="2.6" fill="#FFFFFF" />
    </svg>
  );
}

/** Mark plus wordmark and tagline, as used in the site header. */
export function Logo({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={38} />
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
