"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/signin/actions";
import { useTranslation } from "@/lib/i18n/client";

const INITIAL: AuthState = {};

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { t, tm } = useTranslation();
  const isSignUp = mode === "signup";
  const [state, action, pending] = useActionState(
    isSignUp ? signUp : signIn,
    INITIAL,
  );

  return (
    <form action={action} className="space-y-4">
      {isSignUp ? (
        <Field
          id="name"
          name="name"
          label={t("auth.name")}
          type="text"
          autoComplete="name"
        />
      ) : null}

      <Field
        id="email"
        name="email"
        label={t("auth.email")}
        type="email"
        autoComplete="email"
        required
      />

      <div>
        <Field
          id="password"
          name="password"
          label={t("auth.password")}
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
        />
        {isSignUp ? (
          <p className="mt-1.5 text-xs text-text-subtle">{t("auth.passwordHint")}</p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-down">
          {tm(state.error)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? t("auth.working") : isSignUp ? t("auth.createAccount") : t("auth.signIn")}
      </button>

      <p className="text-center text-sm text-text-muted">
        {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.noAccountYet")}{" "}
        <Link
          href={isSignUp ? "/signin" : "/signup"}
          className="text-accent hover:underline"
        >
          {isSignUp ? t("auth.signIn") : t("auth.createOne")}
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type,
  autoComplete,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[11px] uppercase tracking-wide text-text-subtle">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-full border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
      />
    </label>
  );
}
