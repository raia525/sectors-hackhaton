import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHADOW IDX",
  description:
    "Every stock has a shadow. SHADOW IDX builds a synthetic twin of an Indonesian stock from comparable companies, then shows what part of its move is genuinely its own.",
};

const NAV = [
  { href: "/", label: "Analyse" },
  { href: "/compare", label: "Compare" },
  { href: "/watchlist", label: "Watchlist" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>

        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3.5">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-text">
                SHADOW
              </span>
              <span className="text-[15px] font-light tracking-tight text-text-muted">
                IDX
              </span>
            </Link>

            <nav aria-label="Main">
              <ul className="flex items-center gap-1">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-md px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-5">
            <p className="text-xs leading-relaxed text-text-subtle">
              Market data from the Sectors API. SHADOW IDX reports what has
              already happened in price and news. It does not forecast returns
              and it is not investment advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
