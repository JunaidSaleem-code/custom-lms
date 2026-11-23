"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PASSWORD_MIN_LENGTH } from "../schemas";
import { PasswordField } from "./password-field";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, undefined);

  // After submitting, show only the confirmation message: no form to resubmit or reveal anything else.
  if (state?.success) {
    return (
      <div className="stack">
        <FormMessage success={state.success} />
        <Link href="/login" className="btn btn-ghost">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="fullName" className="label">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          className="input"
          autoComplete="name"
          maxLength={80}
          required
        />
      </div>

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

      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      />
      <PasswordField name="confirm" label="Confirm password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} />

      <FormMessage error={state?.error} />

      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>

      <Link href="/login" className="forgot">
        Already have an account? Sign in
      </Link>
    </form>
  );
}
