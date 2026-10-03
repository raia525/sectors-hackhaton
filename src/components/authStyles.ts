/**
 * Button styles shared by every auth page, server and client alike.
 *
 * Kept in a plain module rather than exported from AuthForm.tsx: that file is
 * "use client", and a server page importing a value from it receives a client
 * reference, not the string itself.
 */

export const AUTH_BUTTON =
  "inline-flex min-w-[9.5rem] items-center justify-center rounded-full bg-accent-bright px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover disabled:opacity-60";

export const AUTH_BUTTON_SECONDARY =
  "inline-flex min-w-[9.5rem] items-center justify-center rounded-full border border-border-strong px-8 py-3 text-sm font-bold uppercase tracking-wide text-text transition-colors hover:bg-surface-raised disabled:opacity-60";
