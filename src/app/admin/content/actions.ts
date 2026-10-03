"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { checkOverride, isEditableKey } from "@/lib/admin/content";
import { isLocale } from "@/lib/i18n/locales";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/** Landing page text overrides. Saving creates or updates; reverting deletes. */

function target(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const locale = String(formData.get("locale") ?? "");
  return isEditableKey(key) && isLocale(locale) ? { key, locale } : null;
}

export async function saveOverride(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = target(formData);
  if (!t) return { error: msg("admin.error.invalid") };

  const check = checkOverride(t.key, String(formData.get("value") ?? ""));
  if (!check.ok) {
    return check.problem === "placeholders"
      ? { error: msg("admin.content.missingPlaceholders", { names: check.missing.map((p) => `{${p}}`).join(", ") }) }
      : { error: msg(`admin.content.problem.${check.problem}`) };
  }

  await prisma.contentOverride.upsert({
    where: { key_locale: t },
    create: { ...t, value: check.value },
    update: { value: check.value },
  });
  await audit(admin, "content.save", `${t.key} (${t.locale})`, { value: check.value });
  revalidatePath("/", "layout");
  return { ok: msg("admin.saved") };
}

export async function revertOverride(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = target(formData);
  if (!t) return { error: msg("admin.error.invalid") };

  await prisma.contentOverride.deleteMany({ where: t });
  await audit(admin, "content.revert", `${t.key} (${t.locale})`);
  revalidatePath("/", "layout");
  return { ok: msg("admin.content.reverted") };
}
