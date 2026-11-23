"use client";

import { useActionState } from "react";
import { resendConfirmationAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

// Shown when sign-in fails because the email isn't confirmed. The email is prefilled and not editable.
export function ResendConfirmationForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendConfirmationAction, undefined);

  return (
    <form action={action} className="form" aria-label="Resend confirmation email">
      <p className="hint">Didn&apos;t get the confirmation email?</p>
      <input type="hidden" name="email" value={email} />
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn btn-ghost" pendingLabel="Sending…">
        Send a new link
      </SubmitButton>
    </form>
  );
}
