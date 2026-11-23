"use client";

import { useActionState } from "react";
import { setPasswordAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PASSWORD_MIN_LENGTH } from "../schemas";
import { PasswordField } from "./password-field";

// Used for both invitations ("create your password") and password resets ("choose a new password").
export function SetPasswordForm({ mode }: { mode: "invite" | "reset" }) {
  const [state, action] = useActionState(setPasswordAction, undefined);
  const hint = `At least ${PASSWORD_MIN_LENGTH} characters. Avoid passwords you use elsewhere.`;

  return (
    <form action={action} className="form">
      <PasswordField
        name="password"
        label={mode === "invite" ? "Create a password" : "New password"}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={hint}
      />
      <PasswordField
        name="confirm"
        label="Confirm password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
      />

      <FormMessage error={state?.error} />

      <SubmitButton pendingLabel="Saving…">
        {mode === "invite" ? "Activate account" : "Update password"}
      </SubmitButton>
    </form>
  );
}
