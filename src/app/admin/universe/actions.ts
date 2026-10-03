"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { audit } from "@/lib/admin/audit";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * The default stock list for the daily run. Once any stock here is active it
 * replaces the MARKET_UNIVERSE environment variable (see queueOrder in
 * src/lib/intelligence/pipeline.ts). Each stock added costs credits every
 * trading day, which is why the page shows the daily cap next to the list.
 */

const done = (ok: FormState["ok"]): FormState => {
  revalidatePath("/admin/universe");
  return { ok };
};

async function nextPosition(): Promise<number> {
  const last = await prisma.universeStock.findFirst({ orderBy: { position: "desc" } });
  return (last?.position ?? -1) + 1;
}

export async function addStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = normalizeSymbol(String(formData.get("symbol") ?? ""));
  if (!symbol) return { error: msg("search.invalidTicker") };
  if (await prisma.universeStock.findUnique({ where: { symbol } })) {
    return { error: msg("admin.universe.exists", { symbol }) };
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
  await prisma.universeStock.create({ data: { symbol, note, position: await nextPosition() } });
  await audit(admin, "universe.add", symbol);

  // Not a refusal: the directory may simply be out of date.
  const known = await prisma.companyDirectoryEntry.findUnique({ where: { symbol } }).catch(() => null);
  return done(known ? msg("admin.universe.added", { symbol }) : msg("admin.universe.addedUnknown", { symbol }));
}

export async function importDefaults(): Promise<FormState> {
  const admin = await requireAdmin();
  const symbols = getEnv()
    .MARKET_UNIVERSE.split(",")
    .map((s) => normalizeSymbol(s))
    .filter((s): s is string => s !== null);

  let position = await nextPosition();
  for (const symbol of symbols) {
    await prisma.universeStock.upsert({
      where: { symbol },
      create: { symbol, position: position++ },
      update: {},
    });
  }
  await audit(admin, "universe.import", symbols.join(","));
  return done(msg("admin.universe.imported", { count: symbols.length }));
}

export async function updateStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = String(formData.get("symbol") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const row = await prisma.universeStock.findUnique({ where: { symbol } });
  if (!row) return { error: msg("admin.error.notFound") };

  if (intent === "toggle") {
    await prisma.universeStock.update({ where: { symbol }, data: { isActive: !row.isActive } });
  } else if (intent === "up" || intent === "down") {
    // Swap places with the neighbour in that direction.
    const neighbour = await prisma.universeStock.findFirst({
      where: { position: intent === "up" ? { lt: row.position } : { gt: row.position } },
      orderBy: { position: intent === "up" ? "desc" : "asc" },
    });
    if (neighbour) {
      await prisma.$transaction([
        prisma.universeStock.update({ where: { symbol }, data: { position: neighbour.position } }),
        prisma.universeStock.update({ where: { symbol: neighbour.symbol }, data: { position: row.position } }),
      ]);
    }
  } else if (intent === "note") {
    const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
    await prisma.universeStock.update({ where: { symbol }, data: { note } });
  } else {
    return { error: msg("admin.error.invalid") };
  }

  await audit(admin, `universe.${intent}`, symbol);
  return done(msg("admin.saved"));
}

export async function removeStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = String(formData.get("symbol") ?? "");
  const row = await prisma.universeStock.delete({ where: { symbol } }).catch(() => null);
  if (!row) return { error: msg("admin.error.notFound") };
  await audit(admin, "universe.remove", symbol);
  return done(msg("admin.deleted"));
}
