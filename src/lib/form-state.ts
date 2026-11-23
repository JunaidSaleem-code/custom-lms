// Shape returned by server actions used with useActionState.
export type FormState =
  | {
      error?: string;
      success?: string;
      fieldErrors?: Record<string, string>;
      // Set when sign-in fails because the email is not confirmed yet. Lets the form offer a resend.
      resendEmail?: string;
    }
  | undefined;
