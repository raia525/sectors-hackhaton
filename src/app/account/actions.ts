"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";
import { SESSION_COOKIE, sessionWasRemembered } from "@/lib/auth/session";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * The signed-in user's own account. Every action reads the user from the
 * session (getCurrentUser, which also honours "sign out everywhere"), never
 * from a submitted id, so it can only ever change the caller's own account.
 */

async function currentUserOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/account");
  return user;
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const parsed = z.string().trim().max(100).safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { error: msg("account.error.nameTooLong") };

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data || null } });
  revalidatePath("/", "layout");
  return { ok: msg("account.saved") };
}

export async function updatePreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const locale = String(formData.get("locale") ?? "");
  if (!isLocale(locale)) return { error: msg("account.error.generic") };

  await prisma.user.update({
    where: { id: user.id },
    data: { locale, briefOptIn: formData.get("briefOptIn") === "on" },
  });
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: msg("account.saved") };
}

/**
 * Changes the password. Every other browser is signed out (passwordChangedAt
 * moves forward); this one gets a fresh session with the lifetime it had,
 * so the person making the change is not thrown out by their own action.
 */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    return { error: msg("account.error.wrongPassword") };
  }
  const policy = validatePassword(next);
  if (policy) return { error: msg(policy) };

  const remembered = sessionWasRemembered((await cookies()).get(SESSION_COOKIE)?.value);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
  });
  await createSession(user.id, remembered);
  return { ok: msg("account.passwordChanged") };
}

export async function signOutEverywhere(): Promise<void> {
  const user = await currentUserOrRedirect();
  await prisma.user.update({ where: { id: user.id }, data: { sessionsRevokedAt: new Date() } });
  await destroySession();
  redirect("/signin");
}

/**
 * Deletes the account and everything stored against it. Confirmed with the
 * password, and refused for the last admin, which would otherwise lock the
 * admin panel for good.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await verifyPassword(String(formData.get("password") ?? ""), record.passwordHash))) {
    return { error: msg("account.error.wrongPassword") };
  }
  if (user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
    return { error: msg("account.error.lastAdmin") };
  }

  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/");
}
