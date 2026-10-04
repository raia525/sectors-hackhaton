import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import { SiteHeader } from "@/components/SiteHeader";
import { GuestHeader } from "@/components/GuestHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SkipLink } from "@/components/SkipLink";
import { I18nProvider } from "@/lib/i18n/client";
import { getTranslator, getLocale } from "@/lib/i18n/server";
import { chatAvailable } from "@/lib/settings/server";
import { ChatWidget } from "@/components/ChatWidget";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/brand/settings";
import { BrandProvider } from "@/components/ui/Logo";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import "./globals.css";

/**
 * Plus Jakarta Sans: a geometric sans designed in Jakarta, with tabular
 * figures, so one typeface serves both the prose and the large headline
 * numbers.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** The favicon is whichever one an admin has activated, else the built-in mark. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "SHADOW IDX",
    description:
      "Every stock has a shadow. SHADOW IDX builds a synthetic twin of an Indonesian stock from comparable companies, then shows what part of its move is genuinely its own.",
    icons: settings.faviconUrl
      ? { icon: [{ url: settings.faviconUrl, type: settings.faviconType ?? undefined }] }
      : { icon: [{ url: "/brand/icon.svg", type: "image/svg+xml" }] },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, user, settings, { t }, chat] = await Promise.all([
    getLocale(),
    getCurrentUser(),
    getSiteSettings(),
    getTranslator(),
    chatAvailable(),
  ]);

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} h-full antialiased`}
      // ThemeScript sets data-theme in <head> before React hydrates, so the
      // attribute is present in the DOM but absent from the server-rendered
      // markup React compares against. That mismatch is intentional (it is
      // what avoids a flash of the wrong theme) and React leaves the
      // attribute in place regardless; this only silences the console
      // warning for a difference that is expected, not a real bug.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        {/* The admin-chosen palette, validated as plain hex colours before it
            is rendered (src/lib/admin/palette.ts), so nothing but colours can
            reach this tag. */}
        {settings.paletteCss ? <style id="brand-palette">{settings.paletteCss}</style> : null}
      </head>
      <body
        className="flex min-h-full flex-col bg-bg"
        // Browser extensions (Grammarly and similar) inject their own
        // attributes into <body> before hydration; same rationale as above.
        suppressHydrationWarning
      >
        <I18nProvider initialLocale={locale} overrides={settings.overrides}>
          <BrandProvider logoUrl={settings.logoUrl}>
          <SkipLink />
          <AnnouncementBar announcements={settings.announcements} signedIn={user !== null} />
          {/*
            The app's menu (Market, Stocks, Portfolio) only makes
            sense once there is an account behind it: every one of those
            routes redirects a signed-out visitor to /signin anyway (see
            src/proxy.ts). A signed-out visitor sees only the landing page
            and the auth pages, so they get a header with sign in and
            register instead of a menu of links that would all bounce them
            straight back here.
          */}
          {user ? (
            <SiteHeader
              account={{ name: user.name, email: user.email }}
              // The admin link, its address and its label are sent only to an
              // admin; nothing in the shared client code names the panel.
              extraLink={user.role === "ADMIN" ? { href: "/admin", label: t("account.adminPanel") } : null}
            />
          ) : (
            <GuestHeader />
          )}
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          {user && chat ? <ChatWidget /> : null}
          </BrandProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
