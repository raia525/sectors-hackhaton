import { z } from "zod";

/**
 * Validated server environment.
 *
 * Parsing at startup turns a missing secret into an immediate, named error
 * instead of an undefined slipping into an Authorization header and producing
 * a confusing 401 at request time.
 *
 * This module is server-only. Importing it from a client component would
 * bundle the secrets into the browser, so it throws if that is attempted.
 */

if (typeof window !== "undefined") {
  throw new Error("src/lib/env.ts is server-only and must not be imported in the browser.");
}

const schema = z.object({
  SECTORS_API_KEY: z.string().min(1, "SECTORS_API_KEY is required."),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string."),

  /** Total credits granted for the hackathon build. */
  SECTORS_CREDIT_LIMIT: z.coerce.number().int().positive().default(1000),
  /** Credits held back so background jobs cannot starve the live demo. */
  SECTORS_CREDIT_RESERVE: z.coerce.number().int().nonnegative().default(150),

  /** Shared secret for the scheduled notification endpoint. */
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters."),

  /** Email delivery. Optional so the app runs without it in development. */
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_FROM_EMAIL: z.string().email().optional(),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters."),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/**
 * Returns the validated environment, parsing once per process.
 *
 * Call this from route handlers rather than at module scope so that a build
 * without secrets present still succeeds.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (parsed.data.SECTORS_CREDIT_RESERVE >= parsed.data.SECTORS_CREDIT_LIMIT) {
    throw new Error(
      "SECTORS_CREDIT_RESERVE must be smaller than SECTORS_CREDIT_LIMIT.",
    );
  }

  cached = parsed.data;
  return cached;
}

/** Clears the cache. Tests only. */
export function resetEnvCache(): void {
  cached = null;
}
