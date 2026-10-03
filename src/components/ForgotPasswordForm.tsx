"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/forgot-password/actions";
import { useTranslation } from "@/lib/i18n/client";
import { Field } from "./AuthForm";
import { AUTH_BUTTON } from "./authStyles";

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
          className={AUTH_BUTTON}
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
        className={AUTH_BUTTON}
      >
        {pending ? t("auth.working") : t("auth.forgot.submitCta")}
      </button>

      <p className="text-[13px] text-text-muted">
        <Link href="/signin" className="font-semibold text-accent underline-offset-2 hover:underline">
          {t("auth.forgot.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
