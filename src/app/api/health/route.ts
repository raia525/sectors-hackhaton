import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getCreditSnapshot, usingPersistentStore } from "@/lib/sectors/server";
import { isEmailConfigured, verifyConnection } from "@/lib/notifications/mailer";
import { latestRun } from "@/lib/intelligence/pipeline";

/**
 * Setup check.
 *
 * Reports which capabilities are actually working, so a misconfiguration
 * surfaces here rather than as a silent absence: alerts that never arrive, or a
 * credit budget that quietly resets on every restart.
 *
 * It reports presence and reachability only, never a secret's value. Verifying
 * SMTP opens a real connection, so it is opt-in via `?smtp=1` rather than run
 * on every request.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const checks: Record<string, unknown> = {};

  try {
    const env = getEnv();
    checks.environment = "valid";
    checks.sectorsApiKey = env.SECTORS_API_KEY ? "set" : "missing";
    checks.email = isEmailConfigured() ? "configured" : "not configured";
  } catch (error) {
    // A failed parse names the offending variables without printing values.
    return NextResponse.json(
      {
        ok: false,
        environment: "invalid",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  checks.storage = usingPersistentStore()
    ? "postgres"
    : "in memory, the credit budget resets on restart";

  try {
    const credits = await getCreditSnapshot();
    checks.credits = {
      spent: credits.spent,
      remaining: credits.remaining,
      limit: credits.limit,
    };
  } catch {
    checks.credits = "unavailable";
  }

  try {
    const run = await latestRun();
    checks.dailyRun = run
      ? {
          date: run.runDate,
          status: run.status,
          creditsSpent: run.creditsSpent,
          creditCap: run.creditCap,
          stocks: run.items.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
          }, {}),
        }
      : "not run yet";
  } catch {
    checks.dailyRun = "unavailable";
  }

  if (new URL(request.url).searchParams.get("smtp") === "1") {
    const result = await verifyConnection();
    checks.smtpConnection = result.ok ? "reachable" : result.reason;
  }

  return NextResponse.json({ ok: true, ...checks });
}
