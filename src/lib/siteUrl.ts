import "server-only";
import { headers } from "next/headers";

/**
 * The origin to build absolute links against, for links that leave the
 * request/response cycle entirely (a verification or reset link mailed to
 * someone, read back on whatever device they open it on).
 *
 * Read from the incoming request's own Host header rather than a hardcoded
 * environment variable, since the app has none today (see src/lib/env.ts)
 * and adding one would need to be kept in sync with wherever it is deployed.
 * The header is trustworthy here: it is the same host the browser used to
 * reach the server action that calls this, not user-supplied data.
 */
export async function getSiteOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
