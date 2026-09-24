import type { CSSProperties } from "react";

/**
 * Attributes that mark an element for the scroll reveal run by ScrollReveal.
 *
 * Kept in a plain module, not the client component's, so server components can
 * call it: a function exported from a "use client" file reaches the server
 * only as a reference, not as something it can execute.
 */
export type RevealVariant = "up" | "left" | "right" | "zoom";

export function reveal(variant: RevealVariant = "up", delayMs = 0) {
  return {
    "data-reveal": variant,
    style: { "--reveal-delay": `${delayMs}ms` } as CSSProperties,
  };
}

/** Delay for a child animation (draw, grow, pop) inside a revealed element. */
export function delay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}
