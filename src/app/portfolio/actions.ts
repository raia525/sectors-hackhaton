"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { normalizeSymbol } from "@/lib/sectors/endpoints";
import { msg, type Message } from "@/lib/i18n/message";
import { parsePreferences } from "@/lib/settings/user";

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
  zScoreThreshold: z.coerce.number().min(0.5).max(6).optional(),
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
    zScoreThreshold: formData.get("zScoreThreshold") || undefined,
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

  // Added from elsewhere (the ticker list) there is no slider, so the
  // user's own default threshold applies.
  let threshold = parsed.data.zScoreThreshold;
  if (threshold === undefined) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    threshold = parsePreferences(user?.preferences).defaultThreshold;
  }

  await prisma.watchlistItem.create({
    data: { userId, symbol, zScoreThreshold: threshold },
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

  revalidatePath("/portfolio", "layout");
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

  revalidatePath("/portfolio", "layout");
  return { success: msg("watchlist.action.removed", { symbol }) };
}

const thresholdSchema = z.object({
  symbol: z.string(),
  zScoreThreshold: z.coerce.number().min(0.5).max(6),
  notifyOnCorporateAction: z.boolean(),
  notifyOnSmartMoney: z.boolean(),
  lots: z.coerce.number().int().min(0).max(1_000_000).optional(),
  avgPrice: z.coerce.number().min(0).max(10_000_000).optional(),
});

/**
 * Saves one watched stock's settings: its alert threshold, which kinds of
 * alert it sends, and the position used to show corporate actions in rupiah.
 * Clearing the position (zero or blank lots) removes it.
 */
export async function updateWatchItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: msg("watchlist.action.signInRequired") };

  const parsed = thresholdSchema.safeParse({
    symbol: formData.get("symbol"),
    zScoreThreshold: formData.get("zScoreThreshold"),
    notifyOnCorporateAction: formData.get("notifyOnCorporateAction") === "on",
    notifyOnSmartMoney: formData.get("notifyOnSmartMoney") === "on",
    lots: formData.get("lots") || undefined,
    avgPrice: formData.get("avgPrice") || undefined,
  });
  if (!parsed.success) {
    return { error: msg("watchlist.action.checkValues") };
  }

  const symbol = normalizeSymbol(parsed.data.symbol);
  if (!symbol) return { error: msg("watchlist.action.unknownTicker") };

  const updated = await prisma.watchlistItem.updateMany({
    where: { userId, symbol },
    data: {
      zScoreThreshold: parsed.data.zScoreThreshold,
      notifyOnCorporateAction: parsed.data.notifyOnCorporateAction,
      notifyOnSmartMoney: parsed.data.notifyOnSmartMoney,
    },
  });
  if (updated.count === 0) return { error: msg("watchlist.action.unknownTicker") };

  const { lots, avgPrice } = parsed.data;
  if (lots && avgPrice) {
    await prisma.holding.upsert({
      where: { userId_symbol: { userId, symbol } },
      create: { userId, symbol, lots, avgPrice },
      update: { lots, avgPrice },
    });
  } else if (!lots) {
    await prisma.holding.deleteMany({ where: { userId, symbol } });
  }

  revalidatePath("/portfolio", "layout");
  return { success: msg("watchlist.action.saved", { symbol }) };
}

/** Turns the daily brief email on or off for the signed-in user only. */
export async function setBriefOptIn(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { briefOptIn: formData.get("enabled") === "true" },
  });
  revalidatePath("/portfolio", "layout");
}

export async function markNotificationsRead(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/portfolio", "layout");
}
