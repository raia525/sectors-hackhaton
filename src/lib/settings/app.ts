import { z } from "zod";
import { FIT_FLOOR, MIN_PEERS, SHIPPED_BARS, SIGNAL_Z, type Bars } from "@/lib/intelligence/track-record";

/**
 * App wide settings an admin can change, one group per AppSetting row.
 *
 * Every group is parsed here with defaults filled in, so a missing row, an
 * old row from before a field existed, or a hand edited bad value all fall
 * back to the shipped behaviour instead of reaching the engines as
 * `undefined`.
 *
 * The signal bars can only be made stricter. Their shipped values are the
 * floor: a lower z, a looser fit or fewer peers would let the app call a
 * weak divergence a signal, which is the one thing it must never do
 * (AGENTS.md, non-negotiable 1).
 */

export type SignalBars = Bars;

export const DEFAULT_BARS: SignalBars = SHIPPED_BARS;

/** Model ids look like "grok-4.3"; anything else is refused before a request is made. */
const MODEL_ID = /^[a-z0-9][a-z0-9.\-]{1,62}$/;

export const DEFAULT_CHAT_MODEL = "grok-4.3";

export const settingSchemas = {
  run: z.object({
    enabled: z.boolean().default(true),
    /** Null means the AUTOMATION_DAILY_CREDIT_CAP environment value. */
    creditCap: z.number().int().min(0).max(1000).nullable().default(null),
    watchedFirst: z.boolean().default(true),
  }),
  signals: z.object({
    signalZ: z.number().min(SIGNAL_Z).max(5).default(SIGNAL_Z),
    fitFloor: z.number().min(FIT_FLOOR).max(0.95).default(FIT_FLOOR),
    minPeers: z.number().int().min(MIN_PEERS).max(10).default(MIN_PEERS),
  }),
  chat: z.object({
    enabled: z.boolean().default(true),
    model: z.string().regex(MODEL_ID).default(DEFAULT_CHAT_MODEL),
    dailyLimit: z.number().int().min(1).max(500).default(30),
    extraInstructions: z
      .string()
      .max(1000)
      .refine((s) => !s.includes("—"), "em dash")
      .default(""),
  }),
  strip: z.object({
    speed: z.enum(["slow", "normal", "fast"]).default("normal"),
    showNames: z.boolean().default(true),
    showMove: z.boolean().default(false),
  }),
} as const;

export type SettingGroup = keyof typeof settingSchemas;
export type AppSettings = { [K in SettingGroup]: z.infer<(typeof settingSchemas)[K]> };

export const SETTING_GROUPS = Object.keys(settingSchemas) as SettingGroup[];

/**
 * Parses one stored group. An invalid stored value falls back to the
 * defaults as a whole rather than half applying.
 */
export function parseGroup<K extends SettingGroup>(group: K, raw: unknown): AppSettings[K] {
  const schema = settingSchemas[group] as unknown as z.ZodType<AppSettings[K], z.ZodTypeDef, unknown>;
  const parsed = schema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return schema.parse({});
}

export function parseAll(rows: { key: string; value: unknown }[]): AppSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(SETTING_GROUPS.map((g) => [g, parseGroup(g, byKey.get(g))])) as AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = parseAll([]);

/** Validates an admin edit; returns the clean value or the failing fields. */
export function validateGroup<K extends SettingGroup>(
  group: K,
  input: unknown,
): { ok: true; value: AppSettings[K] } | { ok: false; fields: string[] } {
  const parsed = settingSchemas[group].safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data as AppSettings[K] };
  return { ok: false, fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
}

/** Seconds per loop of the landing ticker strip, by chosen speed. */
export const STRIP_SECONDS: Record<AppSettings["strip"]["speed"], number> = {
  slow: 90,
  normal: 60,
  fast: 35,
};
