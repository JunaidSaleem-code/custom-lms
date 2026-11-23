"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, undefined);

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="input"
        />
      </div>

      <FormMessage error={state?.error} success={state?.success} />

      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>

      <Link href="/login" className="forgot">
        Back to sign in
      </Link>
    </form>
  );
}
