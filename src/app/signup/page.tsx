import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthLayout } from "@/components/AuthLayout";
import { getSessionUserId } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Create an account | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getSessionUserId()) redirect("/");
  const { t } = await getTranslator();

  return (
    <AuthLayout title={t("auth.signUpTitle")} subtitle={t("auth.signUpSubtitle")}>
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
