"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/admin/audit";
import { bulkAddMessage, DEFAULT_STRIP, parseSymbolList } from "@/lib/admin/symbols";
import { addSymbols, moveSymbol, removeSymbol, replaceSymbols, toggleSymbol } from "@/lib/admin/symbol-list";
import { backfillSectors } from "@/lib/directory/sectors";
import { syncCompanyDirectory } from "@/lib/directory/sync";
import { msg } from "@/lib/i18n/message";
import type { FormState } from "@/lib/forms/state";

/**
 * The landing page ticker strip, and the ticker directory behind it and the
 * Stocks list. Every action re-checks the admin role and is audited.
 */

const done = (ok: FormState["ok"]): FormState => {
  revalidatePath("/admin/ticker-strip");
  revalidatePath("/", "layout");
  return { ok };
};

export async function addStripSymbols(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { symbols, invalid, tooMany } = parseSymbolList(String(formData.get("symbols") ?? ""));
  if (symbols.length === 0) return { error: msg("admin.list.noneValid") };
  const { added, alreadyListed } = await addSymbols("strip", symbols);
  await audit(admin, "strip.add", added.join(","));
  return done(bulkAddMessage({ added: added.length, alreadyListed: alreadyListed.length, invalid, tooMany }));
}

export async function updateStripSymbol(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = String(formData.get("symbol") ?? "");
  const intent = String(formData.get("intent") ?? "");
  let ok = false;
  if (intent === "toggle") ok = await toggleSymbol("strip", symbol);
  else if (intent === "up" || intent === "down") ok = await moveSymbol("strip", symbol, intent);
  else if (intent === "move") ok = await moveSymbol("strip", symbol, Number(formData.get("position")));
  else return { error: msg("admin.error.invalid") };
  if (!ok) return { error: msg("admin.error.notFound") };
  await audit(admin, `strip.${intent}`, symbol);
  return done(msg("admin.saved"));
}

export async function removeStripSymbol(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const symbol = String(formData.get("symbol") ?? "");
  if (!(await removeSymbol("strip", symbol))) return { error: msg("admin.error.notFound") };
  await audit(admin, "strip.remove", symbol);
  return done(msg("admin.deleted"));
}

/** Puts the built-in list in place, so it can be edited from there. */
export async function resetStrip(): Promise<FormState> {
  const admin = await requireAdmin();
  await replaceSymbols("strip", DEFAULT_STRIP);
  await audit(admin, "strip.reset", String(DEFAULT_STRIP.length));
  return done(msg("admin.strip.reset", { count: DEFAULT_STRIP.length }));
}

/**
 * Refreshes the ticker directory from the screener (about 5 credits, through
 * the ledger, which refuses when the budget is spent), then fills sectors
 * from stored analyses.
 */
export async function syncDirectory(): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    const result = await syncCompanyDirectory();
    const sectors = await backfillSectors();
    await audit(admin, "directory.sync", String(result.entriesWritten), { credits: result.creditsSpent, sectors });
    return done(msg("admin.strip.synced", { count: result.entriesWritten, credits: result.creditsSpent, sectors }));
  } catch (error) {
    console.error("Directory sync failed:", error);
    return { error: msg("admin.strip.syncFailed") };
  }
}

/** Fills sectors from stored analyses only. Spends no credit. */
export async function fillSectors(): Promise<FormState> {
  const admin = await requireAdmin();
  const sectors = await backfillSectors();
  await audit(admin, "directory.sectors", String(sectors));
  return done(msg("admin.strip.sectorsFilled", { count: sectors }));
}
