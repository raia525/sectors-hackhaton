import type { ReactNode } from "react";
import { AuthBenefits } from "./AuthBenefits";
import { Card, Container, InkPanel } from "./ui/primitives";
import { LogoMark } from "./ui/Logo";

/**
 * Shared frame for the sign-in and sign-up pages: the reason to register on a
 * dark panel, the form on a white card, side by side on a laptop and stacked
 * on a phone.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-10 lg:py-16">
      <div className="mx-auto grid max-w-5xl items-stretch gap-6 lg:grid-cols-[1fr_1fr]">
        <InkPanel className="order-2 flex flex-col justify-between gap-8 p-8 lg:order-1 lg:p-10">
          <LogoMark size={44} />
          <AuthBenefits />
        </InkPanel>

        <Card className="order-1 p-8 lg:order-2 lg:p-10">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-text">
            {title}
          </h1>
          <p className="mb-8 mt-2 text-[15px] leading-relaxed text-text-muted">{subtitle}</p>
          {children}
        </Card>
      </div>
    </Container>
  );
}
