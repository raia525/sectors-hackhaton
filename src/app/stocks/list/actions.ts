"use server";

import { revalidatePath } from "next/cache";
import { addToWatchlist } from "@/app/portfolio/actions";
import type { FormState } from "@/lib/forms/state";

/**
 * "Watch" from the ticker list: the watchlist's own add action (session
 * check, validation, the user's default threshold), adapted to the shared
 * form state shape.
 */
export async function watchFromList(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await addToWatchlist({}, formData);
  revalidatePath("/stocks/list");
  return result.error ? { error: result.error } : { ok: result.success };
}
