"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { msg, type Message } from "@/lib/i18n/message";

/**
 * Authentication actions.
 *
 * Both sign in and sign up return the same generic message on failure.
 * Distinguishing "no such account" from "wrong password" would turn the sign-in
 * form into an oracle for which email addresses are registered, and on sign up
 * it would confirm an address belongs to an existing user.
 */

export interface AuthState {
  error?: Message;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().max(100).optional(),
});

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: msg(
        issue.path[0] === "password"
          ? "auth.error.passwordRequired"
          : "auth.error.invalidEmail",
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Hash even when the account does not exist, so the response time does not
  // reveal whether the email is registered.
  const stored =
    user?.passwordHash ??
    "0000000000000000000000000000000000000000000000000000000000000000:0000";
  const valid = await verifyPassword(parsed.data.password, stored);

  if (!user || !valid) {
    return { error: msg("auth.error.notRecognised") };
  }

  // Adopts whatever language the sign-in page was displayed in, so a
  // scheduled alert lands in the language the viewer was last using rather
  // than staying pinned to whatever was set at signup.
  const locale = await getLocale();
  if (user.locale !== locale) {
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
  }

  await createSession(user.id);
  redirect("/watchlist");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: msg(
        issue.path[0] === "password"
          ? "auth.error.passwordRequired"
          : "auth.error.invalidEmail",
      ),
    };
  }

  const policyErrorKey = validatePassword(parsed.data.password);
  if (policyErrorKey) return { error: msg(policyErrorKey) };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately identical in shape to other failures.
    return { error: msg("auth.error.couldNotCreate") };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name?.trim() || null,
      locale: await getLocale(),
    },
  });

  await createSession(user.id);
  redirect("/watchlist");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
