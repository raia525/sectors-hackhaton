/**
 * A small in-memory fixed-window rate limiter for auth email sends
 * (verification, sign-in OTP, password reset resends).
 *
 * In-memory rather than Postgres-backed because this app already keeps
 * other per-process state the same way (the Prisma client and the SMTP
 * transporter are both parked on globalThis, see src/lib/db.ts and
 * src/lib/notifications/mailer.ts). A single hackathon instance is the only
 * deployment target; a multi-instance deploy would need this promoted to a
 * shared store, which is noted here rather than built speculatively.
 *
 * Parked on globalThis for the same reason as the Prisma client: Next.js
 * clears module state on every hot reload in development, which would
 * otherwise reset everyone's limit on each edit.
 *
 * Deliberately has no `server-only` guard: it holds no secret and nothing
 * under src/components or any "use client" file imports it, so the module
 * graph is protection enough, and the guard would otherwise block this
 * file's own unit tests (see src/lib/notifications/headers.ts for the same
 * reasoning applied to a different module).
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const globalForRateLimit = globalThis as unknown as {
  shadowRateLimitBuckets?: Map<string, Bucket>;
};

const buckets = globalForRateLimit.shadowRateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.shadowRateLimitBuckets = buckets;

/**
 * Returns true when the action identified by `key` is still allowed, and
 * records this attempt. `key` should combine the action name and the
 * target, for example `otp-resend:someone@example.com`, so different
 * actions and different people never share a budget.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}
