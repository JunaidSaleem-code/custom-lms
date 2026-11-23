"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordField } from "./password-field";
import { ResendConfirmationForm } from "./resend-confirmation-form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, undefined);

  return (
    <div className="form">
      <form action={action} className="form">
        <input type="hidden" name="next" value={next ?? ""} />

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
            aria-invalid={Boolean(state?.error) || undefined}
          />
        </div>

        <PasswordField name="password" label="Password" autoComplete="current-password" />

        <FormMessage error={state?.error} />

        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>

        <Link href="/forgot-password" className="forgot">
          Forgot your password?
        </Link>
      </form>

      {state?.resendEmail && <ResendConfirmationForm email={state.resendEmail} />}
    </div>
  );
}
