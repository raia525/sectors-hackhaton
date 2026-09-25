"use server";

import { prisma } from "@/lib/db";
import { hashPassword, hashToken, validatePassword } from "@/lib/auth";
import { checkTokenValidity } from "@/lib/auth/tokens";
import { msg, type Message } from "@/lib/i18n/message";

export interface ResetPasswordState {
  error?: Message;
  success?: boolean;
}

/**
 * Re-validates the token server side (the page already checked it to decide
 * what to render, but a token can expire or be used by a second tab between
 * that render and this submit) then updates the password.
 *
 * Bumping passwordChangedAt is what signs out every other browser: any
 * session cookie issued before this moment is rejected by getCurrentUser
 * (src/lib/auth.ts), since there is no server-side session table to revoke
 * from directly.
 */
export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) return { error: msg("auth.reset.errorInvalid") };

  const policyErrorKey = validatePassword(password);
  if (policyErrorKey) return { error: msg(policyErrorKey) };

  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  const validity = checkTokenValidity(record, "PASSWORD_RESET", new Date());

  if (validity === "invalid" || !record) {
    return { error: msg("auth.reset.errorInvalid") };
  }
  if (validity === "expired") {
    return { error: msg("auth.reset.errorExpired") };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password), passwordChangedAt: now },
    }),
  ]);

  return { success: true };
}
