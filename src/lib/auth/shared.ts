import { z } from "zod";

/**
 * Pieces shared between the sign-in, sign-up, forgot-password and
 * reset-password actions, so the same email/password rules and the same
 * generic-failure shape apply everywhere a credential is checked.
 */

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().max(100).optional(),
});

export const emailSchema = z.object({ email: z.string().email() });

export const otpSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

/** How many wrong codes a single sign-in challenge tolerates. */
export const MAX_OTP_ATTEMPTS = 5;
export const OTP_TTL_MINUTES = 10;
export const EMAIL_VERIFY_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_HOURS = 1;
