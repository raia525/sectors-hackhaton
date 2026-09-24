"use server";

import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/locales";

/**
 * Persists the viewer's language choice against their account.
 *
 * The cookie set by LanguageToggle is enough for pages the viewer loads
 * directly, since the server reads it per request. But scheduled alerts run
 * with no request and no cookie to read, so a signed-in user's choice is
 * mirrored onto their account the moment they change it. An anonymous
 * visitor's choice stays cookie-only, which is the correct scope for someone
 * with no account to store a preference against.
 */
export async function syncLocalePreference(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const userId = await getSessionUserId();
  if (!userId) return;

  await prisma.user.update({ where: { id: userId }, data: { locale } }).catch(() => {
    // Best-effort: a failed write here should not disrupt the language
    // switch the viewer is actively looking at.
  });
}
