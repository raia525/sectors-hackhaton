import "server-only";
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import {
  buildSessionToken,
  parseSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";

/**
 * Minimal session authentication.
 *
 * Deliberately small rather than a full auth framework: this application has
 * one credential type and one session shape, and a dependency that handles
 * OAuth, magic links and account linking would be more surface area than the
 * feature needs.
 *
 * The security-relevant decisions:
 *
 * - Passwords are hashed with scrypt, which is memory-hard and therefore far
 *   more expensive to attack with GPUs than a plain SHA family hash. Each hash
 *   carries its own random salt.
 * - Session cookies are HMAC-signed, so a user cannot edit their own cookie to
 *   become another user. The cookie is httpOnly, so page scripts cannot read
 *   it, and sameSite lax, which blocks the cross-site form posts that drive
 *   CSRF while keeping ordinary navigation working. The signing and parsing
 *   logic itself lives in src/lib/auth/session.ts, free of Prisma and
 *   next/headers, so middleware can reuse it in the edge runtime.
 * - Every comparison of a secret is timing-safe.
 * - Sign in is two factor: a correct password only issues a one time code by
 *   email, and a session is created solely once that code is verified (see
 *   src/app/signin/actions.ts). Verification and reset links carry a random
 *   token that is stored only as its hash, so a database leak cannot be used
 *   to sign in as someone or reset their password.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  try {
    const derived = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
    const expected = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Starts a session. `rememberMe` picks the cookie's lifetime; the payload
 * always carries its own issue time and expiry, independent of the cookie's
 * own `maxAge`, so a copied cookie cannot outlive what it was signed for.
 */
export async function createSession(userId: string, rememberMe: boolean): Promise<void> {
  const { token, maxAgeSeconds } = buildSessionToken(userId, rememberMe);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Returns the signed-in user's id, or null. Goes through getCurrentUser, not
 * just the cookie signature, so a session ended by a password change or by
 * "sign out everywhere" stops working for server actions too, and the sign
 * in page no longer bounces a revoked cookie to /watchlist. getCurrentUser is
 * cached per request, so this adds no query where the layout already ran it.
 */
export async function getSessionUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}

export { parseSessionToken };

/**
 * The signed-in user, or null. Wrapped in React cache() so the layout, the
 * page and any server component share one lookup per request.
 */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = parseSessionToken(token);
  if (!userId || !token) return null;

  const issuedAtRaw = token.split(".")[1];
  const issuedAt = Number(issuedAtRaw);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordChangedAt: true,
      sessionsRevokedAt: true,
    },
  });
  if (!user) return null;

  // A session issued before the account's latest password change or "sign
  // out everywhere" is stale. This is what signs every other browser out
  // without a server-side session table.
  if (Number.isFinite(issuedAt) && issuedAt < revokedBefore(user)) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** The later of the two moments that invalidate older sessions, in ms. */
function revokedBefore(user: {
  passwordChangedAt: Date | null;
  sessionsRevokedAt: Date | null;
}): number {
  return Math.max(
    user.passwordChangedAt?.getTime() ?? 0,
    user.sessionsRevokedAt?.getTime() ?? 0,
  );
}

/**
 * The signed-in admin, or a 404. Used by the admin layout and, separately,
 * by every admin server action: a server action is a public endpoint, so
 * the layout having checked is not enough. A 404 rather than a redirect, so
 * the panel's existence is not revealed to anyone without access.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

/** A random token for an email verification or password reset link. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hashes a token or one time code for storage and lookup.
 *
 * A plain SHA-256 is enough here, unlike a password hash: the input already
 * has as much entropy as the hash function's output (32 random bytes, or a
 * uniform six digit code drawn against a short expiry and a capped number of
 * attempts), so there is no dictionary to slow down against.
 */
export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** A crypto-random six digit code, zero-padded, for a sign-in OTP. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Password policy, applied at registration. Returns a translation key. */
export function validatePassword(password: string): TranslationKey | null {
  if (password.length < 10) {
    return "auth.error.passwordTooShort";
  }
  if (password.length > 200) {
    // Bounded because scrypt cost scales with input and an unbounded password
    // is a cheap way to make the server do expensive work.
    return "auth.error.passwordTooLong";
  }
  return null;
}
