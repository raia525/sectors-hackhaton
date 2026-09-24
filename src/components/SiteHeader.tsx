"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./ui/Logo";
import { Container } from "./ui/primitives";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav.analyse" },
  { href: "/compare", key: "nav.compare" },
  { href: "/watchlist", key: "nav.watchlist" },
];

/**
 * Site header.
 *
 * The navigation sits in a dark pill so it reads as one control rather than a
 * row of loose links, with the current page filled in the accent colour. On a
 * narrow screen the pill drops to its own row and scrolls sideways instead of
 * wrapping into a second line of links.
 */
export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3.5">
        <Link href="/" aria-label="SHADOW IDX" className="shrink-0">
          <Logo tagline={t("brand.tagline")} />
        </Link>

        <nav
          aria-label="Main"
          className="ink order-3 w-full overflow-x-auto rounded-full p-1 md:order-none md:w-auto"
        >
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href} className="flex-1 md:flex-none">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-full px-5 py-2 text-center text-sm font-semibold transition-colors ${
                      active
                        ? "bg-[#ea580c] text-white"
                        : "text-text-muted hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
