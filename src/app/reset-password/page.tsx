import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { checkTokenValidity } from "@/lib/auth/tokens";
import { getTranslator } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/AuthLayout";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { EmptyState } from "@/components/ui/primitives";

export const metadata = { title: "Reset password | SHADOW IDX" };
export const dynamic = "force-dynamic";

/**
 * Checked once here to decide what to render, and re-checked inside
 * resetPassword itself before the password is actually changed, since a
 * token can expire or be used by another tab between this render and that
 * submit.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { t } = await getTranslator();

  if (!token) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("auth.reset.errorTitle")} description={t("auth.reset.errorInvalid")} />
      </div>
    );
  }

  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  const validity = checkTokenValidity(record, "PASSWORD_RESET", new Date());

  if (validity === "invalid") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("auth.reset.errorTitle")} description={t("auth.reset.errorInvalid")} />
      </div>
    );
  }
  if (validity === "expired") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("auth.reset.errorTitle")} description={t("auth.reset.errorExpired")} />
      </div>
    );
  }

  return (
    <AuthLayout title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
