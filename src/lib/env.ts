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

/**
 * Treats an empty or whitespace-only variable as absent.
 *
 * A .env file expresses "not set" as a blank value, so an optional field must
 * accept that rather than failing its own format check on "".
 */
function emptyAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );
}

const schema = z.object({
  SECTORS_API_KEY: z.string().min(1, "SECTORS_API_KEY is required."),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string."),

  /** Total credits granted for the hackathon build. */
  SECTORS_CREDIT_LIMIT: z.coerce.number().int().positive().default(1000),
  /** Credits held back so background jobs cannot starve the live demo. */
  SECTORS_CREDIT_RESERVE: z.coerce.number().int().nonnegative().default(150),

  /**
   * Stretches the short, price-sensitive cache windows. 1 is normal; raising it
   * during demo rehearsal stops the same prices being re-bought every fifteen
   * minutes. Read directly by the client, declared here so it is validated and
   * documented rather than an undeclared variable.
   */
  SECTORS_CACHE_BOOST: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().min(1).max(96).default(1),
  ),

  /**
   * Credits the daily automated run may spend. Checked before each stock, so
   * a run can finish up to one stock's cost over it. The default covers a few
   * stocks a day on a warm cache, which lasts a 1,000 credit budget for weeks
   * rather than days.
   */
  AUTOMATION_DAILY_CREDIT_CAP: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().int().min(0).max(1000).default(60),
  ),

  /**
   * Stocks the daily brief covers even when nobody watches them, comma
   * separated. Watched stocks are always analysed first.
   */
  MARKET_UNIVERSE: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().default("BBRI,BBCA,BMRI,TLKM,ASII"),
  ),

  /** Shared secret for the scheduled notification endpoint. */
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters."),

  /**
   * SMTP delivery. Every field is optional so the app runs without email in
   * development; the dispatcher checks for a complete set before sending and
   * falls back to in-app notifications when one is missing.
   *
   * Empty strings are normalised to undefined first. A blank line in a .env
   * file means "not configured", but Zod sees "" and fails `.email()`, which
   * would block the whole application over an optional feature.
   */
  SMTP_HOST: emptyAsUndefined(z.string()),
  // Coercion turns "" into 0, which would fail the range check, so a blank
  // value falls back to the default rather than erroring.
  SMTP_PORT: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().int().min(1).max(65535).default(587),
  ),
  SMTP_USER: emptyAsUndefined(z.string()),
  SMTP_PASSWORD: emptyAsUndefined(z.string()),
  NOTIFICATION_FROM_EMAIL: emptyAsUndefined(z.string().email()),

  /**
   * xAI (Grok) key for the chatbot. Optional: without it the chat button is
   * hidden and the rest of the app is unaffected. Server only, like every
   * value here; the browser talks to /api/chat, never to xAI.
   */
  XAI_API_KEY: emptyAsUndefined(z.string().min(20)),

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
