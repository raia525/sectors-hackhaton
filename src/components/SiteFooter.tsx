"use client";

import { useTranslation } from "@/lib/i18n/client";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <p className="text-xs leading-relaxed text-text-subtle">
          {t("footer.disclaimer")}
        </p>
      </div>
    </footer>
  );
}
