"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/forgot-password/actions";
import { useTranslation } from "@/lib/i18n/client";
import { Field } from "./AuthForm";

const INITIAL: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const { t, tm } = useTranslation();
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL);

  if (state.info) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{tm(state.info)}</p>
        <Link
          href="/signin"
          className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          {t("auth.forgot.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field
        id="email"
        name="email"
        label={t("auth.email")}
        type="email"
        autoComplete="email"
        required
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? t("auth.working") : t("auth.forgot.submitCta")}
      </button>

      <p className="text-center text-sm text-text-muted">
        <Link href="/signin" className="text-accent hover:underline">
          {t("auth.forgot.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
