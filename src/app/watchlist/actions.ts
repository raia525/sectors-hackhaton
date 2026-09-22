"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { normalizeSymbol } from "@/lib/sectors/endpoints";

/**
 * Watchlist mutations.
 *
 * Every action re-checks the session and scopes its query by the session's
 * user id. Passing a record id from the client is not enough on its own: a
 * user could send someone else's id, so ownership is enforced in the query
 * itself rather than assumed from the request.
 */

export interface ActionState {
  error?: string;
  success?: string;
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
  if (!userId) return { error: "Sign in to manage your watchlist." };

  const parsed = addSchema.safeParse({
    symbol: formData.get("symbol"),
    zScoreThreshold: formData.get("zScoreThreshold") || 2,
    lots: formData.get("lots") || undefined,
    avgPrice: formData.get("avgPrice") || undefined,
  });

  if (!parsed.success) {
    return { error: "Check the values and try again." };
  }

  const symbol = normalizeSymbol(parsed.data.symbol);
  if (!symbol) {
    return { error: "An IDX ticker is four letters, for example BBRI." };
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_symbol: { userId, symbol } },
  });
  if (existing) return { error: `${symbol} is already on your watchlist.` };

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
  return { success: `${symbol} added to your watchlist.` };
}

export async function removeFromWatchlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sign in to manage your watchlist." };

  const symbol = normalizeSymbol(String(formData.get("symbol") ?? ""));
  if (!symbol) return { error: "Unknown ticker." };

  // Scoped by userId so one user cannot delete another's entry.
  await prisma.watchlistItem.deleteMany({ where: { userId, symbol } });
  await prisma.holding.deleteMany({ where: { userId, symbol } });

  revalidatePath("/watchlist");
  return { success: `${symbol} removed.` };
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
  if (!userId) return { error: "Sign in to manage your watchlist." };

  const parsed = thresholdSchema.safeParse({
    symbol: formData.get("symbol"),
    zScoreThreshold: formData.get("zScoreThreshold"),
  });
  if (!parsed.success) {
    return { error: "The alert threshold must be between 0.5 and 6." };
  }

  const symbol = normalizeSymbol(parsed.data.symbol);
  if (!symbol) return { error: "Unknown ticker." };

  await prisma.watchlistItem.updateMany({
    where: { userId, symbol },
    data: { zScoreThreshold: parsed.data.zScoreThreshold },
  });

  revalidatePath("/watchlist");
  return { success: "Alert threshold updated." };
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
