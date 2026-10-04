"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { audit } from "@/lib/admin/audit";
import { bulkAddMessage, parseSymbolList } from "@/lib/admin/symbols";
import { addSymbols, moveSymbol, removeSymbol, toggleSymbol } from "@/lib/admin/symbol-list";
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

/** Adds one code or a pasted list. */
export async function addStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { symbols, invalid, tooMany } = parseSymbolList(String(formData.get("symbols") ?? ""));
  if (symbols.length === 0) return { error: msg("admin.list.noneValid") };

  const { added, alreadyListed } = await addSymbols("universe", symbols);
  const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
  if (note && added.length > 0) {
    await prisma.universeStock.updateMany({ where: { symbol: { in: added } }, data: { note } });
  }
  await audit(admin, "universe.add", added.join(","));

  // Codes missing from the directory are kept (it may be out of date) but named.
  const known = await prisma.companyDirectoryEntry
    .findMany({ where: { symbol: { in: added } }, select: { symbol: true } })
    .catch(() => []);
  const unknown = added.filter((s) => !known.some((k) => k.symbol === s));
  if (unknown.length > 0 && invalid.length === 0 && !tooMany) {
    return done(msg("admin.universe.addedUnknown", { symbol: unknown.join(", ") }));
  }
  return done(bulkAddMessage({ added: added.length, alreadyListed: alreadyListed.length, invalid, tooMany }));
}

export async function importDefaults(): Promise<FormState> {
  const admin = await requireAdmin();
  const symbols = getEnv()
    .MARKET_UNIVERSE.split(",")
    .map((s) => normalizeSymbol(s))
    .filter((s): s is string => s !== null);
  const { added } = await addSymbols("universe", symbols);
  await audit(admin, "universe.import", added.join(","));
  return done(msg("admin.universe.imported", { count: added.length }));
}

/** Adds the stocks most often watched by verified users, up to ten. */
export async function addMostWatched(): Promise<FormState> {
  const admin = await requireAdmin();
  const watched = await prisma.watchlistItem.groupBy({
    by: ["symbol"],
    where: { user: { emailVerifiedAt: { not: null } } },
    _count: { symbol: true },
    orderBy: { _count: { symbol: "desc" } },
    take: 10,
  });
  const { added } = await addSymbols("universe", watched.map((w) => w.symbol));
  await audit(admin, "universe.addWatched", added.join(","));
  return done(msg("admin.universe.addedWatched", { count: added.length }));
}

export async function updateStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = String(formData.get("symbol") ?? "");
  const intent = String(formData.get("intent") ?? "");

  let ok = false;
  if (intent === "toggle") ok = await toggleSymbol("universe", symbol);
  else if (intent === "up" || intent === "down") ok = await moveSymbol("universe", symbol, intent);
  else if (intent === "move") ok = await moveSymbol("universe", symbol, Number(formData.get("position")));
  else if (intent === "note") {
    const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
    ok = (await prisma.universeStock.updateMany({ where: { symbol }, data: { note } })).count === 1;
  } else {
    return { error: msg("admin.error.invalid") };
  }
  if (!ok) return { error: msg("admin.error.notFound") };

  await audit(admin, `universe.${intent}`, symbol);
  return done(msg("admin.saved"));
}

export async function removeStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = String(formData.get("symbol") ?? "");
  if (!(await removeSymbol("universe", symbol))) return { error: msg("admin.error.notFound") };
  await audit(admin, "universe.remove", symbol);
  return done(msg("admin.deleted"));
}
