"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { BrandMark } from "./ui/Logo";
import { AccountMenu, type AccountSummary, type ExtraLink } from "./AccountMenu";
import { IconChevronRight, IconClose, IconMenu } from "./ui/icons";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Three sections, each with its own tabs (src/components/SectionTabs.tsx):
 * Market (summary, sectors, track record), Stocks (analyse, compare, ticker
 * list) and Portfolio (watchlist, alerts, calendar).
 */
const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/market", key: "nav.market" },
  { href: "/stocks", key: "nav.stocks" },
  { href: "/portfolio", key: "nav.portfolio" },
];

/** Scroll distance before the header detaches and floats. */
const FLOAT_AT = 24;

type Mode = "static" | "expanded" | "minimized";

/**
 * The signed-in navigation. Three states, one set of elements:
 *
 * - static, at the top of the page: a full-width bar with the logo, every
 *   menu link, the two-way language pill and the theme toggle.
 * - expanded, once the page scrolls: the bar detaches into a floating pill
 *   sized to its content, without the logo, still showing every link and
 *   both languages. This is the default floating state.
 * - minimized, on request: the pill shrinks to the current page, a single
 *   language button and the theme toggle.
 *
 * Nothing is mounted or unmounted between states. Parts that disappear (the
 * logo, the other links, the inactive language) collapse to zero width, so
 * every change animates on the same curve instead of snapping. The header
 * keeps a fixed height in every state, so floating it never shifts the page
 * content, which would otherwise move the scroll position it depends on.
 *
 * Returning to the top of the page resets a minimized header, so the next
 * time it floats it starts expanded again.
 */
export function SiteHeader({ account, extraLink }: { account: AccountSummary; extraLink: ExtraLink | null }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [minimizedByUser, setMinimizedByUser] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openedOnPath, setOpenedOnPath] = useState(pathname);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > FLOAT_AT;
      setScrolled(past);
      if (!past) setMinimizedByUser(false);
      else setMenuOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change closes the mobile menu. Adjusted during render rather
  // than in an effect, so it never stays open for a frame over the new page.
  if (pathname !== openedOnPath) {
    setOpenedOnPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  const mode: Mode = !scrolled ? "static" : minimizedByUser ? "minimized" : "expanded";
  const floating = mode !== "static";

  // On a phone the expanded pill is narrower than its links, so the row
  // scrolls sideways. Bring the current page into view whenever the pill
  // expands, so the highlighted link is never the one scrolled out of sight.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mode !== "expanded") return;
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !current) return;
    const target = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [mode, pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-30 flex h-[68px] items-start justify-center ${
        floating ? "pointer-events-none" : ""
      }`}
    >
      <div
        className={`ink nav-anim pointer-events-auto relative flex items-center ${
          floating
            ? "mt-3 w-fit max-w-[calc(100vw-2rem)] gap-0.5 rounded-full p-1 shadow-[var(--shadow-card)]"
            : "mt-0 h-[68px] w-full gap-3 rounded-none px-[max(1.25rem,calc((100vw-1280px)/2+2rem))] py-3"
        }`}
      >
        {/* Logo: static bar only. */}
        <Collapse hidden={floating} className="shrink-0">
          <Link href="/" aria-label="SHADOW IDX" className="flex items-center pr-2">
            <BrandMark size={32} />
          </Link>
        </Collapse>

        <nav
          ref={navRef}
          aria-label="Main"
          className={`nav-anim no-scrollbar min-w-0 overflow-x-auto ${
            floating ? "block grow-0" : "hidden grow md:block"
          }`}
        >
          <ul className="flex items-center gap-0.5">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Collapse hidden={mode === "minimized" && !active}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`nav-anim block whitespace-nowrap rounded-full text-sm font-semibold ${
                        floating ? "px-3 py-1.5 md:px-4" : "px-5 py-2"
                      } ${
                        active
                          ? "bg-accent-bright text-white"
                          : "text-text-muted hover:bg-surface-raised hover:text-text"
                      }`}
                    >
                      {t(item.key)}
                    </Link>
                  </Collapse>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`nav-anim flex shrink-0 items-center ${floating ? "gap-0.5" : "ml-auto gap-2"}`}>
          <LanguageToggle floating={floating} collapsed={mode === "minimized"} />
          <ThemeToggle compact={floating} />
          {/* Hidden when minimized, which keeps only the page, language and theme. */}
          {mode === "minimized" ? null : (
            <span className={floating ? "hidden sm:contents" : "contents"}>
              <AccountMenu account={account} extraLink={extraLink} compact={floating} />
            </span>
          )}

          {/* Mobile menu: static bar only, where the links do not fit. */}
          {!floating ? (
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
          ) : null}

          {/* Minimize (pointing left) or expand (pointing right): floating only. */}
          <Collapse hidden={!floating}>
            <button
              type="button"
              onClick={() => setMinimizedByUser((m) => !m)}
              aria-expanded={mode === "expanded"}
              aria-label={mode === "minimized" ? t("nav.expand") : t("nav.collapse")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
            >
              <span
                className={`nav-anim flex ${mode === "minimized" ? "rotate-0" : "rotate-180"}`}
              >
                <IconChevronRight size={16} />
              </span>
            </button>
          </Collapse>
        </div>
      </div>

      {menuOpen && !floating ? (
        <nav
          id="mobile-nav-panel"
          aria-label="Main"
          className="ink absolute inset-x-4 top-[76px] rounded-[var(--radius)] p-2 shadow-[var(--shadow-card)] md:hidden"
        >
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
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
        </nav>
      ) : null}
    </header>
  );
}

/**
 * Shrinks its content to zero width and fades it, instead of unmounting it,
 * so it leaves and returns with an animation. While hidden it is inert:
 * out of the tab order and the accessibility tree.
 */
function Collapse({
  hidden,
  className = "",
  children,
}: {
  hidden: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      inert={hidden}
      className={`nav-anim overflow-hidden ${
        hidden ? "max-w-0 opacity-0" : "max-w-48 opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  );
}
