"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction } from "@/features/auth/actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/schemas";
import { PasswordField } from "@/features/auth/components/password-field";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear all three fields after a successful change so passwords don't linger on screen.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <PasswordField name="currentPassword" label="Current password" autoComplete="current-password" />
      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      />
      <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} />

      <FormMessage error={state?.error} success={state?.success} />

      <div>
        <SubmitButton pendingLabel="Updating…">Change password</SubmitButton>
      </div>
    </form>
  );
}
