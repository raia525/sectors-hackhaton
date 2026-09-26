"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { LogoMark } from "./ui/Logo";
import { IconChevronDown, IconChevronUp, IconClose, IconMenu } from "./ui/icons";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav.analyse" },
  { href: "/brief", key: "nav.brief" },
  { href: "/compare", key: "nav.compare" },
  { href: "/watchlist", key: "nav.watchlist" },
];

/** Scroll distance before the header minimizes itself. */
const MINIMIZE_AT = 24;

/**
 * The signed-in navigation, floating over the page.
 *
 * Two states:
 *
 * - Expanded, at the top of the page: logo, every menu link, the two-way
 *   language pill and the theme toggle.
 * - Minimized, once the page scrolls: a pill sized to its content holding
 *   only the current page, a one-button language switch and the theme
 *   toggle, with no logo and no spare gaps.
 *
 * The minimized pill carries an expand button, so the full menu is one click
 * away without scrolling back up, and an expanded header that was opened
 * that way carries a button to minimize it again. Returning to the top of
 * the page resets it to the automatic behaviour.
 *
 * Below the `md` breakpoint the expanded links move into a panel under the
 * pill, since the logo, four links and both toggles do not fit on one row.
 */
export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [expandedByUser, setExpandedByUser] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openedOnPath, setOpenedOnPath] = useState(pathname);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > MINIMIZE_AT;
      setScrolled(past);
      // Back at the top the header is expanded anyway, so a manual expand
      // is forgotten and the next scroll down minimizes it again.
      if (!past) setExpandedByUser(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change closes the mobile menu, so navigating never leaves it
  // open over the new page. Adjusted during render rather than in an effect:
  // the menu would otherwise stay visibly open for one extra frame after
  // the route has already changed underneath it.
  if (pathname !== openedOnPath) {
    setOpenedOnPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  const minimized = scrolled && !expandedByUser;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const currentPage = NAV.find((item) => isActive(item.href)) ?? NAV[0];

  const iconButton =
    "flex items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text";

  return (
    <header className="pointer-events-none sticky top-0 z-30 flex justify-center px-4 pt-4">
      {minimized ? (
        <div className="ink pointer-events-auto flex w-fit items-center gap-0.5 rounded-full p-1 shadow-[var(--shadow-card)]">
          <Link
            href={currentPage.href}
            aria-current="page"
            className="whitespace-nowrap rounded-full bg-accent-bright px-4 py-1.5 text-sm font-semibold text-white"
          >
            {t(currentPage.key)}
          </Link>
          <LanguageToggle compact />
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => {
              setExpandedByUser(true);
              setMenuOpen(false);
            }}
            aria-expanded={false}
            aria-label={t("nav.expand")}
            className={`${iconButton} h-8 w-8`}
          >
            <IconChevronDown size={16} />
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto w-full max-w-5xl">
          <div className="ink flex items-center gap-2 rounded-full px-3 py-2.5 shadow-[var(--shadow-card)]">
            <Link href="/" aria-label="SHADOW IDX" className="flex shrink-0 items-center pl-1.5">
              <LogoMark size={30} />
            </Link>

            <nav aria-label="Main" className="hidden flex-1 md:block">
              <NavLinks variant="inline" isActive={isActive} t={t} />
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-panel"
                aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
                className={`${iconButton} h-10 w-10 md:hidden`}
              >
                {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
              </button>
              {scrolled ? (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedByUser(false);
                    setMenuOpen(false);
                  }}
                  aria-expanded
                  aria-label={t("nav.collapse")}
                  className={`${iconButton} h-10 w-10`}
                >
                  <IconChevronUp size={18} />
                </button>
              ) : null}
            </div>
          </div>

          {menuOpen ? (
            <nav
              id="mobile-nav-panel"
              aria-label="Main"
              className="ink mt-2 rounded-[var(--radius)] p-2 shadow-[var(--shadow-card)] md:hidden"
            >
              <NavLinks variant="menu" isActive={isActive} t={t} />
            </nav>
          ) : null}
        </div>
      )}
    </header>
  );
}

function NavLinks({
  variant,
  isActive,
  t,
}: {
  variant: "inline" | "menu";
  isActive: (href: string) => boolean;
  t: (key: TranslationKey) => string;
}) {
  return (
    <ul className={variant === "inline" ? "flex items-center gap-1" : "space-y-1"}>
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`block whitespace-nowrap rounded-full text-sm font-semibold transition-colors ${
                variant === "inline" ? "px-3 py-2 text-center md:px-5" : "px-4 py-2.5"
              } ${
                active
                  ? "bg-accent-bright text-white"
                  : "text-text-muted hover:bg-surface-raised hover:text-text"
              }`}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
