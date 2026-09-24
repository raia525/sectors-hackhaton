import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";
import { Card } from "@/components/ui/primitives";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Create an account | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getSessionUserId()) redirect("/watchlist");
  const { t } = await getTranslator();

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-text">
        {t("auth.signUpTitle")}
      </h1>
      <p className="mb-6 text-sm text-text-muted">{t("auth.signUpSubtitle")}</p>
      <Card>
        <AuthForm mode="signup" />
      </Card>
    </div>
  );
}
