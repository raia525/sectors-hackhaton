import "server-only";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import type { TranslationKey } from "@/lib/i18n/dictionary";

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
 *   CSRF while keeping ordinary navigation working.
 * - Every comparison of a secret is timing-safe.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const SESSION_COOKIE = "shadow_session";
const SESSION_DAYS = 30;
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

/** Signs a payload so it cannot be forged by the holder of the cookie. */
function sign(value: string): string {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(value).digest("hex");
}

function verifySignature(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export async function createSession(userId: string): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;
  const token = `${payload}.${sign(payload)}`;

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Returns the signed-in user's id, or null. Verifies signature and expiry. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!verifySignature(payload, signature)) return null;

  const [userId, expiresRaw] = payload.split(".");
  const expires = Number(expiresRaw);
  if (!userId || !Number.isFinite(expires) || Date.now() > expires) return null;

  return userId;
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
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
