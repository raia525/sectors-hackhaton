"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "@/app/reset-password/actions";
import { useTranslation } from "@/lib/i18n/client";
import { Field } from "./AuthForm";
import { AUTH_BUTTON } from "./authStyles";

const INITIAL: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const { t, tm } = useTranslation();
  const [state, action, pending] = useActionState(resetPassword, INITIAL);

  if (state.success) {
    return (
      <div className="space-y-4">
        <h2 className="text-[20px] font-extrabold tracking-tight text-text">
          {t("auth.reset.successTitle")}
        </h2>
        <p className="text-sm text-text-muted">{t("auth.reset.successBody")}</p>
        <Link
          href="/signin"
          className={AUTH_BUTTON}
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <Field
          id="password"
          name="password"
          label={t("auth.reset.newPasswordLabel")}
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="mt-1.5 text-xs text-text-subtle">{t("auth.passwordHint")}</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-down">
          {tm(state.error)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={AUTH_BUTTON}
      >
        {pending ? t("auth.working") : t("auth.reset.submitCta")}
      </button>
    </form>
  );
}
