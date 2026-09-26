import { after, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { getEnv } from "@/lib/env";
import { recordContinuation, runPipelineStep } from "@/lib/intelligence/pipeline";

/**
 * The daily run: analyse the day's stocks, then send alerts and briefs.
 *
 * Protected by a shared secret rather than a user session, because the caller
 * is a scheduler, not a person. The endpoint spends API credits and sends
 * email, so leaving it open would let anyone drain the budget and mail users.
 *
 * Accepts GET because that is how Vercel Cron calls a route, sending
 * CRON_SECRET as a bearer token; POST stays for triggering a run by hand.
 *
 * It answers immediately and works in `after`, then calls itself for the
 * next step while stocks remain. Each step is one short function run, so the
 * day's work is not bound by a single run's time limit.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Time to spend starting new stocks, leaving headroom under maxDuration. */
const STEP_BUDGET_MS = 25_000;

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    // Deliberately unspecific: a detailed message would help an attacker
    // distinguish a missing header from a wrong secret.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const origin = url.origin;

  after(async () => {
    try {
      const step = await runPipelineStep({ origin, budgetMs: STEP_BUDGET_MS });
      console.log("Daily run step:", JSON.stringify(step));

      if (step.needsContinuation && (await recordContinuation(step.runDate))) {
        // The next step answers at once and does its own work in `after`,
        // so awaiting this only waits for the hand-off, not the analysis.
        await fetch(`${origin}${url.pathname}`, {
          method: "POST",
          headers: { authorization: `Bearer ${getEnv().CRON_SECRET}` },
        });
      }
    } catch (error) {
      console.error("Daily run step failed:", error);
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
