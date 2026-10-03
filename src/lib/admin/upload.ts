/**
 * Checks for an uploaded logo or favicon.
 *
 * The file type is read from the file's own first bytes, never from the
 * name or the MIME type the browser sent: both are chosen by the uploader.
 *
 * SVG gets an extra check. It is a document, not just an image, and an SVG
 * served from this site's own origin could run script if opened directly.
 * Anything that can execute or fetch is refused here, and the asset route
 * serves SVG with a sandboxing Content-Security-Policy as a second layer.
 */

export const MAX_UPLOAD_BYTES = 512 * 1024;

export type ImageType = "image/png" | "image/jpeg" | "image/webp" | "image/x-icon" | "image/svg+xml";

const ALLOWED: Record<"LOGO" | "FAVICON", ImageType[]> = {
  LOGO: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  FAVICON: ["image/png", "image/x-icon", "image/svg+xml"],
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b);

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // "RIFF" ... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon";

  const head = new TextDecoder().decode(bytes.subarray(0, 2048)).replace(/^﻿/, "").trimStart();
  if ((head.startsWith("<svg") || head.startsWith("<?xml")) && head.includes("<svg")) {
    return "image/svg+xml";
  }
  return null;
}

/**
 * True when an SVG contains nothing that can run script or load another
 * resource. Only fragment links (`href="#id"`) are allowed, which is what
 * gradients and reused shapes need.
 */
export function svgIsSafe(svg: string): boolean {
  const forbidden = [
    /<script/i,
    /<foreignObject/i,
    /<iframe|<embed|<object/i,
    /<!ENTITY/i,
    /\bon[a-z]+\s*=/i,
    /javascript:/i,
    /(?:xlink:)?href\s*=\s*["']?\s*(?!#)[^\s"'>]/i,
    /url\(\s*["']?\s*(?!#)[^)\s"']/i,
  ];
  return !forbidden.some((pattern) => pattern.test(svg));
}

export type UploadCheck =
  | { ok: true; mimeType: ImageType }
  | { ok: false; problem: "empty" | "tooLarge" | "unsupported" | "unsafeSvg" };

export function checkUpload(bytes: Uint8Array, kind: "LOGO" | "FAVICON"): UploadCheck {
  if (bytes.length === 0) return { ok: false, problem: "empty" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, problem: "tooLarge" };

  const mimeType = sniffImageType(bytes);
  if (!mimeType || !ALLOWED[kind].includes(mimeType)) return { ok: false, problem: "unsupported" };

  if (mimeType === "image/svg+xml" && !svgIsSafe(new TextDecoder().decode(bytes))) {
    return { ok: false, problem: "unsafeSvg" };
  }
  return { ok: true, mimeType };
}
