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

/** Returns the signed-in user's id, or null. Verifies signature and expiry only. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return parseSessionToken(token);
}

export { parseSessionToken };

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = parseSessionToken(token);
  if (!userId || !token) return null;

  const issuedAtRaw = token.split(".")[1];
  const issuedAt = Number(issuedAtRaw);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, passwordChangedAt: true },
  });
  if (!user) return null;

  // A session issued before the account's most recent password reset is
  // stale: the reset is meant to sign out every other browser, and this is
  // what enforces that without a server-side session table.
  if (
    user.passwordChangedAt &&
    Number.isFinite(issuedAt) &&
    issuedAt < user.passwordChangedAt.getTime()
  ) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name };
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
