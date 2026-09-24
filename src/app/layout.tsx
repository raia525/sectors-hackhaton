import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SkipLink } from "@/components/SkipLink";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
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

export const metadata: Metadata = {
  title: "SHADOW IDX",
  description:
    "Every stock has a shadow. SHADOW IDX builds a synthetic twin of an Indonesian stock from comparable companies, then shows what part of its move is genuinely its own.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

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
      </head>
      <body
        className="flex min-h-full flex-col bg-bg"
        // Browser extensions (Grammarly and similar) inject their own
        // attributes into <body> before hydration; same rationale as above.
        suppressHydrationWarning
      >
        <I18nProvider initialLocale={locale}>
          <SkipLink />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
