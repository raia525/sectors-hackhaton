"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The admin sidebar links, with the current section highlighted. */
export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <nav aria-label="Admin">
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
