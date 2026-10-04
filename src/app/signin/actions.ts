"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  generateOtp,
  hashToken,
  verifyPassword,
} from "@/lib/auth";
import { credentialsSchema, MAX_OTP_ATTEMPTS, OTP_TTL_MINUTES, otpSchema } from "@/lib/auth/shared";
import { getLocale } from "@/lib/i18n/server";
import { msg, type Message } from "@/lib/i18n/message";
import { renderOtpEmail } from "@/lib/notifications/email";
import { sendMail } from "@/lib/notifications/mailer";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Sign in, in two steps.
 *
 * Step one checks the password and, if the account is verified, emails a six
 * digit code and returns a `challenge` instead of creating a session. Step
 * two, verifyLoginOtp, checks that code and only then calls createSession.
 * A session is never created from a password alone.
 *
 * Both steps return the same generic message on a credential failure.
 * Distinguishing "no such account" from "wrong password" would turn the form
 * into an oracle for which email addresses are registered.
 */

export interface AuthState {
  error?: Message;
  info?: Message;
  /** Present once the password step succeeds, switching the form to the code step. */
  challenge?: { id: string; email: string; next?: string };
}

/** Only an internal, site-relative path is honoured, never an absolute URL. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: msg(
        issue.path[0] === "password" ? "auth.error.passwordRequired" : "auth.error.invalidEmail",
      ),
    };
  }

  const email = parsed.data.email.toLowerCase();
  const rememberMe = formData.get("rememberMe") === "on";

  const user = await prisma.user.findUnique({ where: { email } });

  // Hash even when the account does not exist, so response time does not
  // reveal whether the email is registered.
  const stored =
    user?.passwordHash ??
    "0000000000000000000000000000000000000000000000000000000000000000:0000";
  const valid = await verifyPassword(parsed.data.password, stored);

  if (!user || !valid) {
    return { error: msg("auth.error.notRecognised") };
  }

  if (!user.emailVerifiedAt) {
    return { error: msg("auth.error.emailNotVerified") };
  }

  // Adopts whatever language the sign-in page was displayed in, so the OTP
  // email and any later scheduled alert land in the language the viewer was
  // last using.
  const locale = await getLocale();
  if (user.locale !== locale) {
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
  }

  if (!checkRateLimit(`otp-send:${user.id}`, 5, 15 * 60 * 1000)) {
    return { error: msg("auth.otp.error.tooManyAttempts") };
  }

  const next = safeNextPath(formData.get("next"));
  const challenge = await issueLoginOtp(user.id, rememberMe, locale, user.name, user.email);
  return { challenge: { id: challenge.id, email: user.email, next } };
}

async function issueLoginOtp(
  userId: string,
  rememberMe: boolean,
  locale: Awaited<ReturnType<typeof getLocale>>,
  name: string | null,
  email: string,
) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const otp = await prisma.loginOtp.create({
    data: { userId, codeHash: hashToken(code), rememberMe, expiresAt },
  });

  const { subject, html, text } = renderOtpEmail(locale, name, code);
  await sendMail({ to: email, subject, html, text });

  return otp;
}

export async function verifyLoginOtp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = otpSchema.safeParse({
    challengeId: formData.get("challengeId"),
    code: formData.get("code"),
  });
  const email = String(formData.get("email") ?? "");
  const next = safeNextPath(formData.get("next"));
  if (!parsed.success) {
    return {
      error: msg("auth.otp.error.invalid", { remaining: MAX_OTP_ATTEMPTS }),
      challenge: email
        ? { id: String(formData.get("challengeId") ?? ""), email, next }
        : undefined,
    };
  }

  const { challengeId, code } = parsed.data;
  const otp = await prisma.loginOtp.findUnique({ where: { id: challengeId } });

  if (!otp || otp.usedAt) {
    return { error: msg("auth.otp.error.expired") };
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    return { error: msg("auth.otp.error.expired") };
  }
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return { error: msg("auth.otp.error.tooManyAttempts") };
  }

  const provided = Buffer.from(hashToken(code));
  const expected = Buffer.from(otp.codeHash);
  const match = provided.length === expected.length && timingSafeEqual(provided, expected);

  if (!match) {
    const updated = await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - updated.attempts);
    if (remaining === 0) {
      return { error: msg("auth.otp.error.tooManyAttempts") };
    }
    return {
      error: msg("auth.otp.error.invalid", { remaining }),
      challenge: { id: challengeId, email, next },
    };
  }

  await prisma.loginOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  await createSession(otp.userId, otp.rememberMe);
  redirect(next);
}

export async function resendLoginOtp(
  challengeId: string,
  email: string,
  next?: string,
): Promise<AuthState> {
  const otp = await prisma.loginOtp.findUnique({ where: { id: challengeId } });
  if (!otp) return { error: msg("auth.otp.error.expired") };

  if (!checkRateLimit(`otp-send:${otp.userId}`, 5, 15 * 60 * 1000)) {
    return {
      error: msg("auth.otp.error.tooManyAttempts"),
      challenge: { id: challengeId, email, next },
    };
  }

  const user = await prisma.user.findUnique({ where: { id: otp.userId } });
  if (!user) return { error: msg("auth.otp.error.expired") };

  const locale = await getLocale();
  const fresh = await issueLoginOtp(user.id, otp.rememberMe, locale, user.name, user.email);

  return {
    info: msg("auth.otp.resendSuccess"),
    challenge: { id: fresh.id, email: user.email, next },
  };
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
