import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Create an account | SHADOW IDX" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getSessionUserId()) redirect("/watchlist");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-text">
        Create an account
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        Track stocks and receive an alert when one breaks away from its twin.
      </p>
      <Card>
        <AuthForm mode="signup" />
      </Card>
    </div>
  );
}
