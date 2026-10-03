"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { Logo, BrandMark } from "./ui/Logo";
import { Container } from "./ui/primitives";

/**
 * Header for a signed-out visitor on the auth pages.
 *
 * Not shown on the landing page itself, which carries its own navigation
 * inside the hero card (see src/components/landing/Landing.tsx).
 *
 * Carries the logo and a call to action to sign in or register, nothing
 * else: the menu of app sections (Analyse, Brief, Compare, Watchlist) only
 * makes sense once there is an account behind it, so it is withheld until
 * then rather than shown as a set of links that all redirect to sign in.
 */
export function GuestHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <Container className="flex items-center justify-between gap-3 py-3.5">
        <Link href="/" aria-label="SHADOW IDX" className="shrink-0">
          {/* On a phone the wordmark does not fit beside both toggles and
              both buttons, so the mark stands in for it. */}
          <span className="sm:hidden">
            <BrandMark size={36} />
          </span>
          <span className="hidden sm:block">
            <Logo tagline={t("brand.tagline")} />
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/signin"
            className="whitespace-nowrap rounded-full px-2.5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:text-text sm:px-4"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-full bg-accent-bright px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover sm:px-5"
          >
            {t("nav.register")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
