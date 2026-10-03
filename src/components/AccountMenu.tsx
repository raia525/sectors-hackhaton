"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/signin/actions";
import { useTranslation } from "@/lib/i18n/client";
import { IconShield, IconUser } from "./ui/icons";

export interface AccountSummary {
  name: string | null;
  email: string;
  isAdmin: boolean;
}

/**
 * The signed-in user's menu: who is signed in, their profile, the admin
 * panel for admins, and sign out.
 *
 * Sign out is a form posting to the server action, so it works before the
 * page's script has loaded and is never a link a crawler could follow.
 */
export function AccountMenu({ account, compact }: { account: AccountSummary; compact: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (account.name?.trim() || account.email).charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("account.menu")}
        className={`flex items-center justify-center rounded-full bg-accent-bright font-extrabold text-white transition-transform hover:scale-105 ${
          compact ? "h-8 w-8 text-[13px]" : "h-10 w-10 text-sm"
        }`}
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="ink absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--radius-sm)] border border-border p-2 shadow-2xl shadow-black/30"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="truncate text-sm font-bold text-text">{account.name || account.email}</p>
            {account.name ? <p className="truncate text-xs text-text-muted">{account.email}</p> : null}
          </div>
          <div className="border-t border-border pt-1.5">
            <MenuLink href="/account" icon={<IconUser size={16} />} onNavigate={() => setOpen(false)}>
              {t("account.profile")}
            </MenuLink>
            {account.isAdmin ? (
              <MenuLink href="/admin" icon={<IconShield size={16} />} onNavigate={() => setOpen(false)}>
                {t("account.adminPanel")}
              </MenuLink>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="mt-1 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-semibold text-[#f87171] transition-colors hover:bg-surface-raised"
              >
                <SignOutIcon />
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onNavigate,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
    >
      {icon}
      {children}
    </Link>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}
