"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { msg, type Message } from "@/lib/i18n/message";

/**
 * Watchlist mutations.
 *
 * Every action re-checks the session and scopes its query by the session's
 * user id. Passing a record id from the client is not enough on its own: a
 * user could send someone else's id, so ownership is enforced in the query
 * itself rather than assumed from the request.
 *
 * These run as an active request from a signed-in user's own browser, unlike
 * the scheduled alert job, so a Message here is resolved against the current
 * cookie by the calling component (via `tm`), not a stored account locale.
 */

export interface ActionState {
  error?: Message;
  success?: Message;
}

const addSchema = z.object({
  symbol: z.string().min(1),
  zScoreThreshold: z.coerce.number().min(0.5).max(6).default(2),
  lots: z.coerce.number().int().min(0).max(1_000_000).optional(),
  avgPrice: z.coerce.number().min(0).max(10_000_000).optional(),
});

export async function addToWatchlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: msg("watchlist.action.signInRequired") };

  const parsed = addSchema.safeParse({
    symbol: formData.get("symbol"),
    zScoreThreshold: formData.get("zScoreThreshold") || 2,
    lots: formData.get("lots") || undefined,
    avgPrice: formData.get("avgPrice") || undefined,
  });

  if (!parsed.success) {
    return { error: msg("watchlist.action.checkValues") };
  }

  const symbol = normalizeSymbol(parsed.data.symbol);
  if (!symbol) {
    return { error: msg("search.invalidTicker") };
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_symbol: { userId, symbol } },
  });
  if (existing) return { error: msg("watchlist.action.alreadyTracked", { symbol }) };

  await prisma.watchlistItem.create({
    data: { userId, symbol, zScoreThreshold: parsed.data.zScoreThreshold },
  });

  // A position is optional; it exists only to express corporate action effects
  // in rupiah rather than as ratios.
  if (parsed.data.lots && parsed.data.avgPrice) {
    await prisma.holding.upsert({
      where: { userId_symbol: { userId, symbol } },
      create: {
        userId,
        symbol,
        lots: parsed.data.lots,
        avgPrice: parsed.data.avgPrice,
      },
      update: { lots: parsed.data.lots, avgPrice: parsed.data.avgPrice },
    });
  }

  revalidatePath("/watchlist");
  return { success: msg("watchlist.action.added", { symbol }) };
}

export async function removeFromWatchlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: msg("watchlist.action.signInRequired") };

  const symbol = normalizeSymbol(String(formData.get("symbol") ?? ""));
  if (!symbol) return { error: msg("watchlist.action.unknownTicker") };

  // Scoped by userId so one user cannot delete another's entry.
  await prisma.watchlistItem.deleteMany({ where: { userId, symbol } });
  await prisma.holding.deleteMany({ where: { userId, symbol } });

  revalidatePath("/watchlist");
  return { success: msg("watchlist.action.removed", { symbol }) };
}

const thresholdSchema = z.object({
  symbol: z.string(),
  zScoreThreshold: z.coerce.number().min(0.5).max(6),
});

export async function updateThreshold(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: msg("watchlist.action.signInRequired") };

  const parsed = thresholdSchema.safeParse({
    symbol: formData.get("symbol"),
    zScoreThreshold: formData.get("zScoreThreshold"),
  });
  if (!parsed.success) {
    return { error: msg("watchlist.action.thresholdRange") };
  }

  const symbol = normalizeSymbol(parsed.data.symbol);
  if (!symbol) return { error: msg("watchlist.action.unknownTicker") };

  await prisma.watchlistItem.updateMany({
    where: { userId, symbol },
    data: { zScoreThreshold: parsed.data.zScoreThreshold },
  });

  revalidatePath("/watchlist");
  return { success: msg("watchlist.action.thresholdUpdated") };
}

/** Turns the daily brief email on or off for the signed-in user only. */
export async function setBriefOptIn(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { briefOptIn: formData.get("enabled") === "true" },
  });
  revalidatePath("/watchlist");
}

export async function markNotificationsRead(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/watchlist");
}
