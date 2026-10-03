import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { paletteCss } from "@/lib/admin/palette";
import type { Overrides } from "@/lib/i18n/translate";

/**
 * Everything the admin panel can change about the site, read once per
 * request (React cache) and shared by the layout, the translator and pages.
 *
 * A database failure degrades to the built-in site rather than an error
 * page: none of these settings is worth taking the whole app down for.
 */

export interface LiveAnnouncement {
  id: string;
  message: { en: string; id: string };
  tone: "INFO" | "WARNING" | "SUCCESS";
  audience: "ALL" | "SIGNED_IN" | "GUESTS";
  link: { url: string; label: { en: string; id: string } } | null;
}

export interface SiteSettings {
  /** CSS for the active palette, or null for the built-in one. */
  paletteCss: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  faviconType: string | null;
  overrides: { en: Overrides; id: Overrides };
  announcements: LiveAnnouncement[];
}

const BUILT_IN: SiteSettings = {
  paletteCss: null,
  logoUrl: null,
  faviconUrl: null,
  faviconType: null,
  overrides: { en: {}, id: {} },
  announcements: [],
};

/** Ids change on every upload, so the URL doubles as a cache key. */
export const assetUrl = (id: string) => `/api/brand/asset/${id}`;

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const now = new Date();
    const [palette, assets, overrides, announcements] = await Promise.all([
      prisma.brandPalette.findFirst({ where: { isActive: true } }),
      prisma.brandAsset.findMany({
        where: { isActive: true },
        select: { id: true, kind: true, mimeType: true },
      }),
      prisma.contentOverride.findMany({ select: { key: true, locale: true, value: true } }),
      prisma.announcement.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    const logo = assets.find((a) => a.kind === "LOGO");
    const favicon = assets.find((a) => a.kind === "FAVICON");
    const byLocale: SiteSettings["overrides"] = { en: {}, id: {} };
    for (const o of overrides) {
      if (o.locale === "en" || o.locale === "id") byLocale[o.locale][o.key] = o.value;
    }

    return {
      paletteCss: palette ? paletteCss(palette) : null,
      logoUrl: logo ? assetUrl(logo.id) : null,
      faviconUrl: favicon ? assetUrl(favicon.id) : null,
      faviconType: favicon?.mimeType ?? null,
      overrides: byLocale,
      announcements: announcements.map((a) => ({
        id: a.id,
        message: { en: a.messageEn, id: a.messageId },
        tone: a.tone,
        audience: a.audience,
        link: a.linkUrl
          ? {
              url: a.linkUrl,
              label: { en: a.linkLabelEn ?? a.linkUrl, id: a.linkLabelId ?? a.linkLabelEn ?? a.linkUrl },
            }
          : null,
      })),
    };
  } catch {
    return BUILT_IN;
  }
});
