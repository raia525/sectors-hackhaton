/**
 * Form styles shared by the account and admin pages. A plain module, not a
 * "use client" one, so server components can use the strings directly.
 */

export const INPUT =
  "h-11 w-full rounded-[12px] border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none";

export const TEXTAREA =
  "min-h-[88px] w-full rounded-[12px] border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-text placeholder:text-text-subtle focus:border-accent focus:outline-none";

export const LABEL = "mb-1.5 block text-[12px] font-semibold text-text-muted";

export const BUTTON_PRIMARY =
  "inline-flex h-10 items-center justify-center rounded-full bg-accent-bright px-5 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-60";

export const BUTTON_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-full border border-border-strong px-5 text-sm font-bold text-text transition-colors hover:bg-surface-raised disabled:opacity-60";

export const BUTTON_DANGER =
  "inline-flex h-10 items-center justify-center rounded-full border border-down/40 px-5 text-sm font-bold text-down transition-colors hover:bg-down/10 disabled:opacity-60";

export const BUTTON_SMALL =
  "inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-[12px] font-bold text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:opacity-50";
