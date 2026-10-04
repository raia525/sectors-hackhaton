import { en, type PublicKey } from "@/lib/i18n/dictionary";

/**
 * Which strings an admin may override, and what makes an override valid.
 *
 * An allow-list rather than every key: the landing page is marketing copy an
 * admin is expected to tune, while analysis findings and caveats are part of
 * how the engines explain their own limits and must stay as written.
 */

export const EDITABLE_KEYS: readonly PublicKey[] = (Object.keys(en) as PublicKey[]).filter(
  (key) => key.startsWith("landing.") || key === "home.description" || key === "brand.tagline",
);

const EDITABLE = new Set<string>(EDITABLE_KEYS);

export function isEditableKey(key: string): key is PublicKey {
  return EDITABLE.has(key);
}

/** Long enough for any landing paragraph, short enough to stop a pasted essay. */
export const MAX_OVERRIDE_LENGTH = 600;

/** The `{name}` placeholders in a string, sorted and de-duplicated. */
export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
}

export type OverrideCheck =
  | { ok: true; value: string }
  | { ok: false; problem: "empty" | "tooLong" | "emDash" }
  | { ok: false; problem: "placeholders"; missing: string[] };

/**
 * Validates an override against its default.
 *
 * Every placeholder in the default must survive, or the figure it carries
 * (a ticker count, a step number) would silently vanish from the page. An em
 * dash is refused because the interface is written without them.
 */
export function checkOverride(key: PublicKey, raw: string): OverrideCheck {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, problem: "empty" };
  if (value.length > MAX_OVERRIDE_LENGTH) return { ok: false, problem: "tooLong" };
  if (value.includes("—")) return { ok: false, problem: "emDash" };

  const present = new Set(placeholders(value));
  const missing = placeholders(en[key]).filter((p) => !present.has(p));
  if (missing.length > 0) return { ok: false, problem: "placeholders", missing };

  return { ok: true, value };
}
