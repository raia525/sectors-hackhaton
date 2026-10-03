import Link from "next/link";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { checkTokenValidity } from "@/lib/auth/tokens";
import { getTranslator } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/AuthLayout";
import { EmptyState } from "@/components/ui/primitives";
import { AUTH_BUTTON } from "@/components/authStyles";

export const metadata = { title: "Verify email | SHADOW IDX" };
export const dynamic = "force-dynamic";

/**
 * Landing point for the link mailed by signUp (src/app/signup/actions.ts).
 *
 * The token is looked up by its hash, never stored or logged raw, matching
 * how a password is never compared by storing the plaintext. A used or
 * expired token fails the same way an unrecognised one does: there is
 * nothing more specific to say that would not also help someone probing for
 * valid tokens.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { t } = await getTranslator();

  if (!token) {
    return <VerifyFailure title={t("auth.verify.errorTitle")} body={t("auth.verify.errorInvalid")} />;
  }

  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  const validity = checkTokenValidity(record, "EMAIL_VERIFY", new Date());

  if (validity === "invalid" || !record) {
    return <VerifyFailure title={t("auth.verify.errorTitle")} body={t("auth.verify.errorInvalid")} />;
  }
  if (validity === "expired") {
    return <VerifyFailure title={t("auth.verify.errorTitle")} body={t("auth.verify.errorExpired")} />;
  }

  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);

  return (
    <AuthLayout title={t("auth.verify.successTitle")} subtitle={t("auth.verify.successBody")}>
      <Link
        href="/signin?verified=1"
        className={AUTH_BUTTON}
      >
        {t("auth.signIn")}
      </Link>
    </AuthLayout>
  );
}

function VerifyFailure({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState title={title} description={body} />
    </div>
  );
}
