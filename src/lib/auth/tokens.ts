/**
 * Pure checks against an already-fetched AuthToken row.
 *
 * Split out so the "is this token still good" decision is a plain function of
 * its inputs, not an inline `Date.now()` call inside a server component's
 * render body, which React's purity rule for components rejects since it can
 * produce a different result on every render of what should be a stable tree.
 */

export type TokenValidity = "valid" | "invalid" | "expired";

export function checkTokenValidity(
  record: { purpose: string; usedAt: Date | null; expiresAt: Date } | null,
  expectedPurpose: string,
  now: Date,
): TokenValidity {
  if (!record || record.purpose !== expectedPurpose || record.usedAt) return "invalid";
  if (record.expiresAt.getTime() < now.getTime()) return "expired";
  return "valid";
}
