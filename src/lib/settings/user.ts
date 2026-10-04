import { z } from "zod";

/**
 * A user's own settings, stored as JSON on the user row and parsed here so
 * an old or malformed value falls back to the defaults.
 */

/** The optional panels under an analysis, in their default order. */
export const ANALYSIS_PANELS = ["keyStats", "corporateActions", "seasonality", "smartMoney"] as const;
export type AnalysisPanel = (typeof ANALYSIS_PANELS)[number];

export const HOME_TABS = ["market", "stocks", "portfolio"] as const;
export type HomeTab = (typeof HOME_TABS)[number];

export const HOME_PATH: Record<HomeTab, string> = {
  market: "/market",
  stocks: "/stocks",
  portfolio: "/portfolio",
};

const panelSchema = z.enum(ANALYSIS_PANELS);

export const userPreferencesSchema = z.object({
  /** Panels shown, in this order. A panel left out is hidden. */
  panels: z
    .array(panelSchema)
    .max(ANALYSIS_PANELS.length)
    .transform((list) => [...new Set(list)])
    .default([...ANALYSIS_PANELS]),
  /** z threshold given to a stock when it is added to the watchlist. */
  defaultThreshold: z.number().min(1).max(5).default(2),
  homeTab: z.enum(HOME_TABS).default("market"),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const DEFAULT_PREFERENCES: UserPreferences = userPreferencesSchema.parse({});

export function parsePreferences(raw: unknown): UserPreferences {
  const parsed = userPreferencesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}
