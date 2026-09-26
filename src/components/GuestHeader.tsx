"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./ui/Logo";
import { Container } from "./ui/primitives";

/**
 * Header for a signed-out visitor, shown only on the landing page.
 *
 * Carries the logo and a call to action to sign in or register, nothing
 * else: the menu of app sections (Analyse, Brief, Compare, Watchlist) only
 * makes sense once there is an account behind it, so it is withheld until
 * then rather than shown as a set of links that all redirect to sign in.
 */
export function GuestHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <Container className="flex items-center justify-between gap-4 py-3.5">
        <Link href="/" aria-label="SHADOW IDX" className="shrink-0">
          <Logo tagline={t("brand.tagline")} />
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/signin"
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:text-text"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-accent-bright px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
          >
            {t("nav.register")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
