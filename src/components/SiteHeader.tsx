"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav.analyse" },
  { href: "/compare", key: "nav.compare" },
  { href: "/watchlist", key: "nav.watchlist" },
];

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-accent text-[13px] font-bold text-accent-contrast"
          >
            S
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-text">
              SHADOW
            </span>
            <span className="text-[15px] font-light tracking-tight text-text-muted">
              IDX
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-full px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
