import { prisma } from "@/lib/db";

/**
 * Serves an uploaded logo or favicon from the database.
 *
 * Public, since logos appear on signed-out pages. Cached for a year as
 * immutable: an asset row never changes after upload (a new upload is a new
 * id, and so a new URL), so a browser never needs to ask again.
 *
 * `nosniff` stops a browser second-guessing the stored type. SVG also gets a
 * sandboxing Content-Security-Policy, the second layer behind the upload
 * check in src/lib/admin/upload.ts: opened directly, it can neither run
 * script nor load anything.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Not found", { status: 404 });

  const asset = await prisma.brandAsset
    .findUnique({ where: { id }, select: { data: true, mimeType: true } })
    .catch(() => null);
  if (!asset) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": asset.mimeType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (asset.mimeType === "image/svg+xml") {
    headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }

  return new Response(new Uint8Array(asset.data), { headers });
}
