import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "./env";

/**
 * Shared bearer-token check for scheduler-triggered endpoints.
 *
 * These endpoints spend API credits, touch the database, or send email, and
 * are called by a scheduler rather than a signed-in person, so a session
 * check does not apply. Comparison is timing-safe: a plain string comparison
 * returns as soon as it finds a differing byte, which leaks the secret one
 * character at a time to anyone who can measure response times.
 */
export function isCronAuthorized(request: Request): boolean {
  const env = getEnv();
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(env.CRON_SECRET);
  // timingSafeEqual throws on length mismatch, which would itself leak the
  // secret's length, so lengths are compared separately and constant work is
  // still performed either way.
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}
