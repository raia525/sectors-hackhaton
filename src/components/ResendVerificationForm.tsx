"use client";

import { useActionState } from "react";
import { resendVerificationEmail, type ResendState } from "@/app/signup/actions";
import { useTranslation } from "@/lib/i18n/client";
import { Field } from "./AuthForm";

const INITIAL: ResendState = {};

/** The resend form on /verify-email/sent, for a link that expired or never arrived. */
export function ResendVerificationForm({ initialEmail }: { initialEmail: string }) {
  const { t, tm } = useTranslation();
  const [state, action, pending] = useActionState(resendVerificationEmail, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Field
        id="email"
        name="email"
        label={t("auth.email")}
        type="email"
        autoComplete="email"
        required
        defaultValue={initialEmail}
      />

      {state.info ? (
        <p role="status" className="text-sm text-text-muted">
          {tm(state.info)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full border border-border-strong px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-raised disabled:opacity-60"
      >
        {pending ? t("auth.working") : t("auth.verify.resendCta")}
      </button>
    </form>
  );
}
