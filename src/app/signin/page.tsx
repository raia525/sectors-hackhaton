import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Sign in | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await getSessionUserId()) redirect("/watchlist");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-text">
        Sign in
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        Your watchlist and alert settings are stored against your account.
      </p>
      <Card>
        <AuthForm mode="signin" />
      </Card>
    </div>
  );
}
