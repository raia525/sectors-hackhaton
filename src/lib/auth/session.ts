import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session cookie signing and parsing, kept free of Prisma and next/headers.
 *
 * Split out from src/lib/auth.ts so the Proxy file (src/proxy.ts) can verify
 * a session cookie's signature and expiry without pulling in the database
 * client or the Zod-parsed environment module that auth.ts also needs for
 * scrypt-based password hashing and email sending.
 *
 * Deliberately has no `server-only` guard, unlike auth.ts: that package
 * throws unconditionally outside Next's own bundler (see
 * src/lib/notifications/headers.ts for the same reasoning), which would
 * block this file's own unit tests. Protection against a client bundle
 * pulling this in comes from the module graph instead: nothing under
 * src/components or any "use client" file imports it.
 *
 * AUTH_SECRET is read directly from process.env rather than through
 * src/lib/env.ts's getEnv(), so this module has no dependency on the rest
 * of the server environment parsing successfully, including DATABASE_URL
 * and the SMTP settings this module has no business needing.
 */

export const SESSION_COOKIE = "shadow_session";
/** "Remember me" session length. */
export const REMEMBER_SESSION_DAYS = 30;
/** Session length when "remember me" is left unchecked. */
export const SHORT_SESSION_HOURS = 12;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }
  return secret;
}

/** Signs a payload so it cannot be forged by the holder of the cookie. */
export function sign(value: string): string {
  return createHmac("sha256", authSecret()).update(value).digest("hex");
}

function verifySignature(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Verifies a session cookie's signature and expiry only, with no database
 * lookup, so it can run from middleware. The password-change invalidation
 * that a stolen but still time-valid cookie should also fail lives in
 * getCurrentUser (src/lib/auth.ts), which runs on every gated page after
 * middleware has already let the request through.
 */
export function parseSessionToken(token: string | undefined): string | null {
  if (!token) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!verifySignature(payload, signature)) return null;

  const [userId, , expiresRaw] = payload.split(".");
  const expires = Number(expiresRaw);
  if (!userId || !Number.isFinite(expires) || Date.now() > expires) return null;

  return userId;
}

/** Builds the signed cookie value for a new session. Does not set the cookie. */
export function buildSessionToken(
  userId: string,
  rememberMe: boolean,
): { token: string; maxAgeSeconds: number } {
  const maxAgeSeconds = rememberMe
    ? REMEMBER_SESSION_DAYS * 24 * 60 * 60
    : SHORT_SESSION_HOURS * 60 * 60;
  const issuedAt = Date.now();
  const expires = issuedAt + maxAgeSeconds * 1000;
  const payload = `${userId}.${issuedAt}.${expires}`;
  return { token: `${payload}.${sign(payload)}`, maxAgeSeconds };
}
