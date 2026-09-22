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

/**
 * Authentication actions.
 *
 * Both sign in and sign up return the same generic message on failure.
 * Distinguishing "no such account" from "wrong password" would turn the sign-in
 * form into an oracle for which email addresses are registered, and on sign up
 * it would confirm an address belongs to an existing user.
 */

export interface AuthState {
  error?: string;
}

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
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
    return { error: parsed.error.issues[0].message };
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
    return { error: "That email and password combination is not recognised." };
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
    return { error: parsed.error.issues[0].message };
  }

  const policyError = validatePassword(parsed.data.password);
  if (policyError) return { error: policyError };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately identical in shape to other failures.
    return { error: "That account could not be created. Try signing in instead." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name?.trim() || null,
    },
  });

  await createSession(user.id);
  redirect("/watchlist");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
