"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { LogoMark } from "./ui/Logo";
import { IconClose, IconMenu } from "./ui/icons";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav.analyse" },
  { href: "/brief", key: "nav.brief" },
  { href: "/compare", key: "nav.compare" },
  { href: "/watchlist", key: "nav.watchlist" },
];

/** Scroll distance before the header switches to its minimized form. */
const MINIMIZE_AT = 24;

/**
 * The signed-in navigation.
 *
 * Rendered only for a signed-in visitor (see RootLayout), floating over the
 * page rather than sitting in its own bordered row: it detaches from the top
 * of the viewport and shrinks to a compact pill once the page has scrolled
 * past MINIMIZE_AT, then expands back the moment it returns to the top. The
 * language and theme toggles stay inside the same floating pill in both
 * states, so nothing about the header moves to a different part of the
 * screen as it collapses.
 *
 * Below the `md` breakpoint there is not enough width for the logo, four
 * links and both toggles on one pill, so the links move into a menu that
 * opens as its own panel beneath the pill, the same shape at every scroll
 * position rather than wrapping into a second row that would break the
 * pill's rounded silhouette.
 */
export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [minimized, setMinimized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openedOnPath, setOpenedOnPath] = useState(pathname);

  useEffect(() => {
    const onScroll = () => setMinimized(window.scrollY > MINIMIZE_AT);
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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const links = (variant: "inline" | "menu") => (
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

  return (
    <header className="pointer-events-none sticky top-0 z-30 flex justify-center px-4 pt-4">
      <div
        className={`pointer-events-auto w-full transition-all duration-300 ${
          minimized ? "max-w-5xl md:max-w-3xl" : "max-w-5xl"
        }`}
      >
        <div
          className={`ink mx-auto flex items-center gap-2 rounded-full shadow-[var(--shadow-card)] transition-all duration-300 ${
            minimized ? "px-2 py-2" : "px-3 py-2.5"
          }`}
        >
          <Link href="/" aria-label="SHADOW IDX" className="flex shrink-0 items-center pl-1.5">
            <LogoMark size={minimized ? 26 : 30} />
          </Link>

          <nav aria-label="Main" className="hidden flex-1 md:block">
            {links("inline")}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 pr-0.5">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-panel"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text md:hidden"
            >
              {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="mobile-nav-panel"
            aria-label="Main"
            className="ink mt-2 rounded-[var(--radius)] p-2 shadow-[var(--shadow-card)] md:hidden"
          >
            {links("menu")}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
