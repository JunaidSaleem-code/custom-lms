"use client";

import { useActionState } from "react";
import { updateProfileAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Props = {
  email: string;
  fullName: string | null;
  phone: string | null;
};

export function ProfileForm({ email, fullName, phone }: Props) {
  const [state, action] = useActionState(updateProfileAction, undefined);

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" className="input" value={email} readOnly aria-describedby="email-hint" />
        <span id="email-hint" className="hint">
          Your email is used to sign in. Contact the team to change it.
        </span>
      </div>

      <div className="field">
        <label htmlFor="full_name" className="label">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          className="input"
          defaultValue={fullName ?? ""}
          autoComplete="name"
          maxLength={80}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="phone" className="label">
          Phone <span className="hint">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          defaultValue={phone ?? ""}
          autoComplete="tel"
          maxLength={20}
        />
      </div>

      <FormMessage error={state?.error} success={state?.success} />

      <div>
        <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}
