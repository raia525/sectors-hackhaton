"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateToken, hashPassword, hashToken, validatePassword } from "@/lib/auth";
import { credentialsSchema, EMAIL_VERIFY_TTL_HOURS, emailSchema } from "@/lib/auth/shared";
import { getLocale } from "@/lib/i18n/server";
import { msg, type Message } from "@/lib/i18n/message";
import { renderVerificationEmail } from "@/lib/notifications/email";
import { sendMail } from "@/lib/notifications/mailer";
import { getSiteOrigin } from "@/lib/siteUrl";
import { checkRateLimit } from "@/lib/rateLimit";

export interface SignUpState {
  error?: Message;
}

/**
 * Creates the account and emails a verification link. No session is
 * created here: the account cannot be used to sign in until the link is
 * clicked (see verifyEmailToken and the emailVerifiedAt check in
 * src/app/signin/actions.ts).
 */
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: msg(
        issue.path[0] === "password" ? "auth.error.passwordRequired" : "auth.error.invalidEmail",
      ),
    };
  }

  const policyErrorKey = validatePassword(parsed.data.password);
  if (policyErrorKey) return { error: msg(policyErrorKey) };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately identical in shape to other failures, so this form
    // cannot be used to test which addresses already have an account.
    return { error: msg("auth.error.couldNotCreate") };
  }

  const locale = await getLocale();
  const name = parsed.data.name?.trim() || null;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(parsed.data.password),
      name,
      locale,
    },
  });

  await issueVerificationEmail(user.id, email, name, locale);

  redirect(`/verify-email/sent?email=${encodeURIComponent(email)}`);
}

async function issueVerificationEmail(
  userId: string,
  email: string,
  name: string | null,
  locale: Awaited<ReturnType<typeof getLocale>>,
) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000);

  await prisma.authToken.create({
    data: { userId, purpose: "EMAIL_VERIFY", tokenHash: hashToken(token), expiresAt },
  });

  const origin = await getSiteOrigin();
  const verifyUrl = `${origin}/verify-email?token=${token}`;
  const { subject, html, text } = renderVerificationEmail(locale, name, verifyUrl);
  await sendMail({ to: email, subject, html, text });
}

export interface ResendState {
  info?: Message;
}

/**
 * Resends the verification link. Always reports the same generic success,
 * whether or not the address has an account or is already verified, so this
 * form cannot be used to probe either fact.
 */
export async function resendVerificationEmail(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { info: msg("auth.verify.resendSuccess") };

  const email = parsed.data.email.toLowerCase();
  if (!checkRateLimit(`verify-resend:${email}`, 3, 15 * 60 * 1000)) {
    return { info: msg("auth.verify.resendSuccess") };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    const locale = await getLocale();
    await issueVerificationEmail(user.id, user.email, user.name, locale);
  }

  return { info: msg("auth.verify.resendSuccess") };
}
