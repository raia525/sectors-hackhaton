"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { parseWib } from "@/lib/admin/schedule";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/** Announcement banners: create, update, switch on or off, delete. */

const optional = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v));

const fields = z.object({
  messageEn: z.string().trim().min(1).max(280),
  messageId: z.string().trim().min(1).max(280),
  tone: z.enum(["INFO", "WARNING", "SUCCESS"]),
  audience: z.enum(["ALL", "SIGNED_IN", "GUESTS"]),
  // A site path or a full http(s) URL; nothing else, so no javascript: link.
  linkUrl: optional(300).refine((v) => v === null || /^(\/(?!\/)|https?:\/\/)/.test(v)),
  linkLabelEn: optional(60),
  linkLabelId: optional(60),
});

function parse(formData: FormData) {
  const parsed = fields.safeParse({
    messageEn: formData.get("messageEn") ?? "",
    messageId: formData.get("messageId") ?? "",
    tone: formData.get("tone"),
    audience: formData.get("audience"),
    linkUrl: formData.get("linkUrl") ?? "",
    linkLabelEn: formData.get("linkLabelEn") ?? "",
    linkLabelId: formData.get("linkLabelId") ?? "",
  });
  if (!parsed.success) return { error: msg("admin.error.invalid") } as const;
  if (`${parsed.data.messageEn}${parsed.data.messageId}`.includes("—")) {
    return { error: msg("admin.content.problem.emDash") } as const;
  }

  const startsAt = parseWib(String(formData.get("startsAt") ?? ""));
  const endsAt = parseWib(String(formData.get("endsAt") ?? ""));
  if (startsAt && endsAt && endsAt <= startsAt) return { error: msg("admin.announcements.badWindow") } as const;

  return { data: { ...parsed.data, startsAt, endsAt, isActive: formData.get("isActive") === "on" } } as const;
}

export async function createAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  const a = await prisma.announcement.create({ data: result.data });
  await audit(admin, "announcement.create", a.id, { messageEn: a.messageEn });
  revalidatePath("/", "layout");
  return { ok: msg("admin.announcements.created") };
}

export async function updateAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  const a = await prisma.announcement.update({ where: { id }, data: result.data }).catch(() => null);
  if (!a) return { error: msg("admin.error.notFound") };
  await audit(admin, "announcement.update", a.id, { isActive: a.isActive });
  revalidatePath("/", "layout");
  return { ok: msg("admin.saved") };
}

export async function deleteAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const a = await prisma.announcement.delete({ where: { id } }).catch(() => null);
  if (!a) return { error: msg("admin.error.notFound") };
  await audit(admin, "announcement.delete", a.id, { messageEn: a.messageEn });
  revalidatePath("/", "layout");
  return { ok: msg("admin.deleted") };
}
