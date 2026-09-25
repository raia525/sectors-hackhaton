import { getTranslator } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/AuthLayout";
import { ResendVerificationForm } from "@/components/ResendVerificationForm";

export const metadata = { title: "Check your inbox | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const { t } = await getTranslator();

  return (
    <AuthLayout
      title={t("auth.verify.sentTitle")}
      subtitle={t("auth.verify.sentBody", { email: email ?? "" })}
    >
      <ResendVerificationForm initialEmail={email ?? ""} />
    </AuthLayout>
  );
}
