"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The tabs inside a menu section (Market, Stocks, Portfolio). The first tab
 * is the section's own page, so it is active only on an exact match; the
 * others also cover anything below them.
 *
 * Scrolls sideways on a phone rather than wrapping, so the row keeps one
 * line and the page below does not jump.
 */
export function SectionTabs({
  label,
  items,
}: {
  label: string;
  /** `count`, when above zero, shows as a small badge (unread alerts). */
  items: { href: string; label: string; count?: number; countLabel?: string }[];
}) {
  const pathname = usePathname();
  const [first] = items;
  const isActive = (href: string) =>
    href === first?.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label={label} className="-mx-1">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-1 py-1">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-text text-surface"
                    : "text-text-muted hover:bg-surface-raised hover:text-text"
                }`}
              >
                {item.label}
                {item.count ? (
                  <span
                    aria-label={item.countLabel}
                    className="tnum ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-bright px-1.5 text-[11px] font-bold text-white"
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
