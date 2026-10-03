"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { isHexColour, PALETTE_FIELDS, type PaletteColours } from "@/lib/admin/palette";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * Colour palettes. At most one is active; with none active the built-in
 * palette in globals.css applies, which is also what "use built-in" does.
 */

function readPalette(formData: FormData): { name: string; colours: PaletteColours } | null {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const colours = Object.fromEntries(
    PALETTE_FIELDS.map((field) => [field, String(formData.get(field) ?? "").toLowerCase()]),
  ) as PaletteColours;
  if (!name || !PALETTE_FIELDS.every((field) => isHexColour(colours[field]))) return null;
  return { name, colours };
}

function refresh(ok: FormState["ok"]): FormState {
  revalidatePath("/", "layout");
  return { ok };
}

export async function createPalette(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const input = readPalette(formData);
  if (!input) return { error: msg("admin.colours.invalid") };

  const palette = await prisma.brandPalette.create({ data: { name: input.name, ...input.colours } });
  await audit(admin, "palette.create", palette.name, input.colours);
  return refresh(msg("admin.colours.created", { name: palette.name }));
}

export async function updatePalette(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const input = readPalette(formData);
  if (!input) return { error: msg("admin.colours.invalid") };

  const palette = await prisma.brandPalette
    .update({ where: { id }, data: { name: input.name, ...input.colours } })
    .catch(() => null);
  if (!palette) return { error: msg("admin.error.notFound") };
  await audit(admin, "palette.update", palette.name, input.colours);
  return refresh(msg("admin.saved"));
}

export async function activatePalette(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  // "builtin" switches every custom palette off.
  await prisma.$transaction([
    prisma.brandPalette.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    ...(id === "builtin" ? [] : [prisma.brandPalette.update({ where: { id }, data: { isActive: true } })]),
  ]).catch(() => null);

  await audit(admin, "palette.activate", id);
  return refresh(msg("admin.colours.activated"));
}

export async function deletePalette(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const palette = await prisma.brandPalette.findUnique({ where: { id } });
  if (!palette) return { error: msg("admin.error.notFound") };
  if (palette.isActive) return { error: msg("admin.colours.deleteActive") };

  await prisma.brandPalette.delete({ where: { id } });
  await audit(admin, "palette.delete", palette.name);
  return refresh(msg("admin.deleted"));
}
