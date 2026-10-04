"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms/state";
import { useTranslation } from "@/lib/i18n/client";

/** Pending state of the surrounding ActionForm, read by SubmitButton. */
const PendingContext = createContext(false);

/**
 * A form posting to a server action, with the action's returned message
 * shown under it in the viewer's language. Fields are passed as children, so
 * the page around it stays a server component.
 *
 * It submits from onSubmit rather than through the form's `action` prop on
 * purpose: React resets a form after every `action` submission, including
 * one the server refused, which threw away everything the person had typed
 * the moment one field was wrong. Here the fields are kept on an error and
 * reset only on success, which also shows edit forms their saved values.
 *
 * `confirm`, when set, asks before submitting: used for deletes, where a
 * stray click should not be enough.
 */
export function ActionForm({
  action,
  children,
  className = "",
  confirm,
  encType,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  encType?: "multipart/form-data";
}) {
  const { tm } = useTranslation();
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      encType={encType}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending || (confirm && !window.confirm(confirm))) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(data));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {state.error ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-down">
          {tm(state.error)}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="mt-2 text-[13px] font-semibold text-up">
          {tm(state.ok)}
        </p>
      ) : null}
    </form>
  );
}

/**
 * A submit button that shows a working label while its form is pending. It
 * follows an ActionForm when inside one, and a plain action form otherwise.
 */
export function SubmitButton({
  children,
  className,
  name,
  value,
}: {
  children: ReactNode;
  className: string;
  name?: string;
  value?: string;
}) {
  const inActionForm = useContext(PendingContext);
  const { pending: formPending } = useFormStatus();
  const pending = inActionForm || formPending;
  const { t } = useTranslation();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={className}>
      {pending ? t("auth.working") : children}
    </button>
  );
}
