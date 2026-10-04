import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthLayout } from "@/components/AuthLayout";
import { getSessionUserId } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Sign in | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; reset?: string; next?: string }>;
}) {
  if (await getSessionUserId()) redirect("/");
  const { t } = await getTranslator();
  const { verified, reset, next } = await searchParams;

  return (
    <AuthLayout title={t("auth.signInTitle")} subtitle={t("auth.signInSubtitle")}>
      {next ? (
        <p className="mb-4 rounded-[var(--radius-sm)] border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
          {t("auth.gate.body")}
        </p>
      ) : null}
      {verified ? (
        <p role="status" className="mb-4 text-sm text-up">
          {t("auth.verify.successBody")}
        </p>
      ) : null}
      {reset ? (
        <p role="status" className="mb-4 text-sm text-up">
          {t("auth.reset.successBody")}
        </p>
      ) : null}
      <AuthForm mode="signin" next={next} />
    </AuthLayout>
  );
}
