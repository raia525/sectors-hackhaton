import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runScheduledAlerts } from "@/lib/notifications/dispatch";

/**
 * Scheduled alert endpoint.
 *
 * Protected by a shared secret rather than a user session, because the caller
 * is a scheduler, not a person. The endpoint spends API credits and sends
 * email, so leaving it open would let anyone drain the budget and mail users.
 *
 * Comparison is timing-safe. A plain string comparison returns as soon as it
 * finds a differing byte, which leaks the secret one character at a time to
 * anyone who can measure response times.
 */

export const dynamic = "force-dynamic";
/** Analysing a watchlist involves many upstream calls, so allow real time. */
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const env = getEnv();
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(env.CRON_SECRET);
  // timingSafeEqual throws on length mismatch, which would itself leak the
  // secret's length, so lengths are compared separately and constant work is
  // still performed.
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    // Deliberately unspecific: a detailed message would help an attacker
    // distinguish a missing header from a wrong secret.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runScheduledAlerts();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Scheduled alert run failed:", error);
    return NextResponse.json(
      { ok: false, error: "The alert run failed. See server logs." },
      { status: 500 },
    );
  }
}

/** GET is rejected so the job cannot be triggered by a crawler or a link. */
export async function GET() {
  return NextResponse.json({ error: "Use POST." }, { status: 405 });
}
