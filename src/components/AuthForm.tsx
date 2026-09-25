"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resendLoginOtp, signIn, verifyLoginOtp, type AuthState } from "@/app/signin/actions";
import { signUp, type SignUpState } from "@/app/signup/actions";
import { useTranslation } from "@/lib/i18n/client";

const SIGN_IN_INITIAL: AuthState = {};
const SIGN_UP_INITIAL: SignUpState = {};

/**
 * Sign in and sign up, in one component.
 *
 * Sign in is two forms in sequence, not one: the password step's action
 * (signIn) returns a `challenge` instead of creating a session, and once one
 * is present the component switches to the OTP step, which posts to a
 * different action (verifyLoginOtp). This keeps both steps as ordinary
 * server actions driven by useActionState rather than a client-side session
 * of their own, matching the rest of the app's server-first data flow.
 */
export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next?: string }) {
  if (mode === "signup") return <SignUpForm />;
  return <SignInForm next={next} />;
}

function SignUpForm() {
  const { t, tm } = useTranslation();
  const [state, action, pending] = useActionState(signUp, SIGN_UP_INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Field id="name" name="name" label={t("auth.name")} type="text" autoComplete="name" />

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
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? t("auth.working") : t("auth.createAccount")}
      </button>

      <p className="text-center text-sm text-text-muted">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/signin" className="text-accent hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}

function SignInForm({ next }: { next?: string }) {
  const { t, tm } = useTranslation();
  const [state, action, pending] = useActionState(signIn, SIGN_IN_INITIAL);

  if (state.challenge) {
    return <OtpForm challenge={state.challenge} />;
  }

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        id="email"
        name="email"
        label={t("auth.email")}
        type="email"
        autoComplete="email"
        required
      />

      <Field
        id="password"
        name="password"
        label={t("auth.password")}
        type="password"
        autoComplete="current-password"
        required
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-4 w-4 rounded border-border-strong accent-accent"
          />
          {t("auth.rememberMe")}
        </label>
        <Link href="/forgot-password" className="text-sm text-accent hover:underline">
          {t("auth.forgotPassword")}
        </Link>
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
        {pending ? t("auth.working") : t("auth.signIn")}
      </button>

      <p className="text-center text-sm text-text-muted">
        {t("auth.noAccountYet")}{" "}
        <Link href="/signup" className="text-accent hover:underline">
          {t("auth.createOne")}
        </Link>
      </p>
    </form>
  );
}

function OtpForm({ challenge }: { challenge: { id: string; email: string; next?: string } }) {
  const { t, tm } = useTranslation();
  const [state, action, pending] = useActionState(verifyLoginOtp, {
    challenge,
  } as AuthState);
  const [resending, setResending] = useState(false);
  const [resendState, setResendState] = useState<AuthState>({});

  const activeChallenge = state.challenge ?? challenge;

  async function handleResend() {
    setResending(true);
    const result = await resendLoginOtp(
      activeChallenge.id,
      activeChallenge.email,
      activeChallenge.next,
    );
    setResendState(result);
    setResending(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {t("auth.otp.subtitle", { email: activeChallenge.email })}
      </p>

      <form action={action} className="space-y-4">
        <input type="hidden" name="challengeId" value={activeChallenge.id} />
        <input type="hidden" name="email" value={activeChallenge.email} />
        {activeChallenge.next ? (
          <input type="hidden" name="next" value={activeChallenge.next} />
        ) : null}

        <Field
          id="code"
          name="code"
          label={t("auth.otp.codeLabel")}
          type="text"
          autoComplete="one-time-code"
          required
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
        />

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
          {pending ? t("auth.working") : t("auth.otp.submit")}
        </button>
      </form>

      {resendState.info ? (
        <p role="status" className="text-center text-sm text-text-muted">
          {tm(resendState.info)}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="w-full text-center text-sm text-accent hover:underline disabled:opacity-60"
      >
        {resending ? t("auth.working") : t("auth.otp.resend")}
      </button>
    </div>
  );
}

export function Field({
  id,
  name,
  label,
  type,
  autoComplete,
  required = false,
  defaultValue,
  inputMode,
  maxLength,
  pattern,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[11px] uppercase tracking-wide text-text-subtle">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        className={`mt-1 w-full rounded-full border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none ${
          inputMode === "numeric" ? "tracking-[0.3em]" : ""
        }`}
      />
    </label>
  );
}
