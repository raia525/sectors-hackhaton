import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthLayout } from "@/components/AuthLayout";
import { getSessionUserId } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Sign in | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await getSessionUserId()) redirect("/watchlist");
  const { t } = await getTranslator();

  return (
    <AuthLayout title={t("auth.signInTitle")} subtitle={t("auth.signInSubtitle")}>
      <AuthForm mode="signin" />
    </AuthLayout>
  );
}
