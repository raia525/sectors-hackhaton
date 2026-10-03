"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { checkUpload } from "@/lib/admin/upload";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * Logos and favicons: upload, rename, activate, switch back to the built-in
 * mark, delete. At most one of each kind is active at a time.
 */

type Kind = "LOGO" | "FAVICON";
const readKind = (formData: FormData): Kind | null => {
  const kind = String(formData.get("kind") ?? "");
  return kind === "LOGO" || kind === "FAVICON" ? kind : null;
};

function refresh(ok: FormState["ok"]): FormState {
  revalidatePath("/", "layout");
  return { ok };
}

export async function uploadAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const kind = readKind(formData);
  const file = formData.get("file");
  if (!kind || !(file instanceof File)) return { error: msg("admin.error.invalid") };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(bytes, kind);
  if (!check.ok) return { error: msg(`admin.assets.problem.${check.problem}`) };

  const name = (String(formData.get("name") ?? "").trim() || file.name || kind).slice(0, 80);
  const activate = formData.get("activate") === "on";

  const asset = await prisma.$transaction(async (tx) => {
    if (activate) await tx.brandAsset.updateMany({ where: { kind, isActive: true }, data: { isActive: false } });
    return tx.brandAsset.create({
      data: { kind, name, mimeType: check.mimeType, data: Buffer.from(bytes), size: bytes.length, isActive: activate },
      select: { id: true, name: true },
    });
  });
  await audit(admin, "asset.upload", `${kind} ${asset.name}`, { size: bytes.length, type: check.mimeType });
  return refresh(msg("admin.assets.uploaded", { name: asset.name }));
}

export async function activateAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const kind = readKind(formData);
  const id = String(formData.get("id") ?? "");
  if (!kind) return { error: msg("admin.error.invalid") };

  // "builtin" switches every upload of this kind off.
  await prisma
    .$transaction([
      prisma.brandAsset.updateMany({ where: { kind, isActive: true }, data: { isActive: false } }),
      ...(id === "builtin" ? [] : [prisma.brandAsset.update({ where: { id }, data: { isActive: true } })]),
    ])
    .catch(() => null);

  await audit(admin, "asset.activate", `${kind} ${id}`);
  return refresh(msg("admin.assets.activated"));
}

export async function renameAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: msg("admin.error.invalid") };

  const asset = await prisma.brandAsset.update({ where: { id }, data: { name }, select: { name: true } }).catch(() => null);
  if (!asset) return { error: msg("admin.error.notFound") };
  await audit(admin, "asset.rename", asset.name);
  return refresh(msg("admin.saved"));
}

export async function deleteAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const asset = await prisma.brandAsset.delete({ where: { id }, select: { name: true, kind: true } }).catch(() => null);
  if (!asset) return { error: msg("admin.error.notFound") };
  await audit(admin, "asset.delete", `${asset.kind} ${asset.name}`);
  return refresh(msg("admin.deleted"));
}
