import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { Container } from "@/components/ui/primitives";
import { AdminNav } from "./AdminNav";
import { I18nExtension } from "@/lib/i18n/client";
import { adminEn, adminId } from "@/lib/i18n/admin-dictionary";

export const metadata = { title: "Admin | SHADOW IDX" };
export const dynamic = "force-dynamic";

/**
 * The admin panel's frame. requireAdmin() answers 404 to anyone without the
 * admin role, so the panel's existence is not revealed. Each admin server
 * action checks again on its own, since an action can be called directly.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [admin, { t }] = await Promise.all([requireAdmin(), getTranslator()]);

  const items = [
    { href: "/admin", label: t("admin.nav.overview") },
    { href: "/admin/users", label: t("admin.nav.users") },
    { href: "/admin/content", label: t("admin.nav.content") },
    { href: "/admin/announcements", label: t("admin.nav.announcements") },
    { href: "/admin/universe", label: t("admin.nav.universe") },
    { href: "/admin/ticker-strip", label: t("admin.nav.strip") },
    { href: "/admin/settings", label: t("admin.nav.settings") },
    { href: "/admin/colours", label: t("admin.nav.colours") },
    { href: "/admin/assets", label: t("admin.nav.assets") },
    { href: "/admin/audit", label: t("admin.nav.audit") },
  ];

  return (
    <Container className="py-8 lg:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="ink rounded-[var(--radius)] p-3 lg:sticky lg:top-24">
          <p className="px-3 pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle">
            {t("admin.title")}
          </p>
          <AdminNav items={items} label={t("admin.title")} />
          <p className="mt-3 truncate border-t border-border px-3 pt-3 text-[12px] text-text-subtle">{admin.email}</p>
        </aside>
        {/* Admin copy reaches the browser only here, inside a response that
            requireAdmin() already limited to admins. */}
        <I18nExtension messages={{ en: adminEn, id: adminId }}>
          <div className="min-w-0 space-y-6">{children}</div>
        </I18nExtension>
      </div>
    </Container>
  );
}
