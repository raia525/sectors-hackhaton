"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resendLoginOtp, signIn, verifyLoginOtp, type AuthState } from "@/app/signin/actions";
import { signUp, type SignUpState } from "@/app/signup/actions";
import { useTranslation } from "@/lib/i18n/client";
import { IconKey, IconLock, IconMail, IconUser } from "./ui/icons";
import { AUTH_BUTTON } from "./authStyles";

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
        className={AUTH_BUTTON}
      >
        {pending ? t("auth.working") : t("auth.createAccount")}
      </button>

      <p className="text-[13px] text-text-muted">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/signin" className="font-semibold text-accent underline-offset-2 hover:underline">
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

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-text-muted">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-[18px] w-[18px] cursor-pointer rounded accent-accent-bright"
          />
          {t("auth.rememberMe")}
        </label>
        <Link
          href="/forgot-password"
          className="text-[13px] font-semibold text-accent underline-offset-2 hover:underline"
        >
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
        className={AUTH_BUTTON}
      >
        {pending ? t("auth.working") : t("auth.signIn")}
      </button>

      <p className="text-[13px] text-text-muted">
        {t("auth.noAccountYet")}{" "}
        <Link href="/signup" className="font-semibold text-accent underline-offset-2 hover:underline">
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
          icon="key"
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
          className={AUTH_BUTTON}
        >
          {pending ? t("auth.working") : t("auth.otp.submit")}
        </button>
      </form>

      {resendState.info ? (
        <p role="status" className="text-[13px] text-text-muted">
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

const FIELD_ICONS = { mail: IconMail, lock: IconLock, user: IconUser, key: IconKey };

/**
 * A pill input with an icon, the label shown as its placeholder.
 *
 * The label is still a real <label> for screen readers; only its visible
 * text moves into the placeholder, with the icon keeping the field
 * recognisable once something has been typed over it.
 */
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
  icon,
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
  icon?: keyof typeof FIELD_ICONS;
}) {
  const Icon =
    FIELD_ICONS[icon ?? (type === "email" ? "mail" : type === "password" ? "lock" : "user")];

  return (
    <label htmlFor={id} className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
        <Icon size={18} />
      </span>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={label}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        className={`h-12 w-full rounded-full border border-transparent bg-accent-soft pl-12 pr-4 text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent focus:bg-surface focus:outline-none ${
          inputMode === "numeric" ? "tracking-[0.3em]" : ""
        }`}
      />
    </label>
  );
}
