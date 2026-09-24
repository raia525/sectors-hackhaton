"use client";

import { useTranslation } from "@/lib/i18n/client";
import { LogoMark } from "./ui/Logo";
import { Container } from "./ui/primitives";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-border">
      <Container className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="text-sm font-bold text-text">
            SHADOW <span className="font-medium text-text-muted">IDX</span>
          </span>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-text-subtle md:text-right">
          {t("footer.disclaimer")}
        </p>
      </Container>
    </footer>
  );
}
