import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/AuthLayout";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Reset password | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await getSessionUserId()) redirect("/");
  const { t } = await getTranslator();

  return (
    <AuthLayout title={t("auth.forgot.title")} subtitle={t("auth.forgot.subtitle")}>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
