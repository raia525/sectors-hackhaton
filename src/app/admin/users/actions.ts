"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin, validatePassword } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * User management. Every action checks the admin role itself (a server
 * action is a public endpoint) and records what it did.
 *
 * Two guards protect access to the panel itself: an admin cannot demote or
 * delete their own account, and the last admin cannot be removed by anyone.
 */

const userFields = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(100),
  role: z.enum(["USER", "ADMIN"]),
  locale: z.enum(["en", "id"]),
});

async function isLastAdmin(userId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "ADMIN") return false;
  return (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1;
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = userFields.safeParse({
    email: formData.get("email"),
    name: formData.get("name") ?? "",
    role: formData.get("role"),
    locale: formData.get("locale") ?? "en",
  });
  if (!parsed.success) return { error: msg("admin.error.invalid") };

  const password = String(formData.get("password") ?? "");
  const policy = validatePassword(password);
  if (policy) return { error: msg(policy) };

  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
    return { error: msg("admin.users.emailTaken") };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      role: parsed.data.role,
      locale: parsed.data.locale,
      passwordHash: await hashPassword(password),
      // An admin-created account may be marked verified up front, since the
      // admin is vouching for the address.
      emailVerifiedAt: formData.get("verified") === "on" ? new Date() : null,
    },
  });
  await audit(admin, "user.create", user.email, { role: user.role });
  revalidatePath("/admin/users");
  return { ok: msg("admin.users.created", { email: user.email }) };
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = userFields.safeParse({
    email: formData.get("email"),
    name: formData.get("name") ?? "",
    role: formData.get("role"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { error: msg("admin.error.invalid") };

  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return { error: msg("admin.error.notFound") };

  if (current.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    if (id === admin.id) return { error: msg("admin.users.cannotDemoteSelf") };
    if (await isLastAdmin(id)) return { error: msg("admin.users.lastAdmin") };
  }
  if (parsed.data.email !== current.email) {
    if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
      return { error: msg("admin.users.emailTaken") };
    }
  }

  const verified = formData.get("verified") === "on";
  await prisma.user.update({
    where: { id },
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      role: parsed.data.role,
      locale: parsed.data.locale,
      briefOptIn: formData.get("briefOptIn") === "on",
      emailVerifiedAt: verified ? (current.emailVerifiedAt ?? new Date()) : null,
    },
  });
  await audit(admin, "user.update", parsed.data.email, { role: parsed.data.role, verified });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: msg("admin.saved") };
}

/** Sets a new password and signs the user out everywhere. */
export async function setUserPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const policy = validatePassword(password);
  if (policy) return { error: msg(policy) };

  const user = await prisma.user
    .update({ where: { id }, data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date() } })
    .catch(() => null);
  if (!user) return { error: msg("admin.error.notFound") };

  await audit(admin, "user.password", user.email);
  return { ok: msg("admin.users.passwordSet") };
}

export async function signOutUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user
    .update({ where: { id }, data: { sessionsRevokedAt: new Date() } })
    .catch(() => null);
  if (!user) return { error: msg("admin.error.notFound") };

  await audit(admin, "user.signOut", user.email);
  return { ok: msg("admin.users.signedOut") };
}

export async function deleteUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return { error: msg("admin.users.cannotDeleteSelf") };
  if (await isLastAdmin(id)) return { error: msg("admin.users.lastAdmin") };

  const user = await prisma.user.delete({ where: { id } }).catch(() => null);
  if (!user) return { error: msg("admin.error.notFound") };

  await audit(admin, "user.delete", user.email);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
