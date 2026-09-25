"use server";

import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/auth";
import { emailSchema, PASSWORD_RESET_TTL_HOURS } from "@/lib/auth/shared";
import { getLocale } from "@/lib/i18n/server";
import { msg, type Message } from "@/lib/i18n/message";
import { renderPasswordResetEmail } from "@/lib/notifications/email";
import { sendMail } from "@/lib/notifications/mailer";
import { getSiteOrigin } from "@/lib/siteUrl";
import { checkRateLimit } from "@/lib/rateLimit";

export interface ForgotPasswordState {
  info?: Message;
}

/**
 * Emails a reset link when the address has a verified account, and reports
 * the same generic outcome either way. Distinguishing "no such account" from
 * "email sent" would turn this form into an oracle for which addresses are
 * registered, the same reasoning already applied to sign in and sign up.
 */
export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { info: msg("auth.forgot.genericSent") };

  const email = parsed.data.email.toLowerCase();
  if (!checkRateLimit(`reset-request:${email}`, 3, 15 * 60 * 1000)) {
    return { info: msg("auth.forgot.genericSent") };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.emailVerifiedAt) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);

    await prisma.authToken.create({
      data: { userId: user.id, purpose: "PASSWORD_RESET", tokenHash: hashToken(token), expiresAt },
    });

    const locale = await getLocale();
    const origin = await getSiteOrigin();
    const resetUrl = `${origin}/reset-password?token=${token}`;
    const { subject, html, text } = renderPasswordResetEmail(locale, user.name, resetUrl);
    await sendMail({ to: user.email, subject, html, text });
  }

  return { info: msg("auth.forgot.genericSent") };
}
