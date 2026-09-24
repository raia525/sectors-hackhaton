import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { syncCompanyDirectory } from "@/lib/directory/sync";

/**
 * Refreshes the local IDX ticker directory from the screener endpoint.
 *
 * Run this once after setup so the search dropdown has data, and on a
 * schedule thereafter. New listings and delistings are rare, so weekly is
 * ample; there is no need for anything more frequent.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncCompanyDirectory();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Company directory sync failed:", error);
    return NextResponse.json(
      { ok: false, error: "The sync failed. See server logs." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST." }, { status: 405 });
}
