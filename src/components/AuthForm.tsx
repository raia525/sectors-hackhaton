"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/signin/actions";

const INITIAL: AuthState = {};

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
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
          label="Name, optional"
          type="text"
          autoComplete="name"
        />
      ) : null}

      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />

      <div>
        <Field
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
        />
        {isSignUp ? (
          <p className="mt-1.5 text-xs text-text-subtle">
            At least 10 characters. Length matters more than symbols.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-down">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Working" : isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-text-muted">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link
          href={isSignUp ? "/signin" : "/signup"}
          className="text-accent hover:underline"
        >
          {isSignUp ? "Sign in" : "Create one"}
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
        className="mt-1 w-full rounded-[8px] border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
      />
    </label>
  );
}
