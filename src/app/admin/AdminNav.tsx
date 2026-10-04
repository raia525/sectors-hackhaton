"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar links with the current one highlighted. The first item is the
 * section's own page, matched exactly. Addresses and the label come in as
 * props, so this client chunk holds none of its own.
 */
export function AdminNav({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === items[0]?.href ? pathname === href : pathname.startsWith(href));

  return (
    <nav aria-label={label}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-accent-bright text-white" : "text-text-muted hover:bg-surface-raised hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
