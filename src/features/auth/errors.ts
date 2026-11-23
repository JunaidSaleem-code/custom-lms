// Turns Supabase Auth errors into messages that are safe to show.
// Sign-in errors are deliberately generic so they don't reveal which emails have accounts.
type AuthErrorLike = { code?: string; status?: number } | null | undefined;

export function isRateLimited(e: AuthErrorLike): boolean {
  return (
    e?.status === 429 ||
    e?.code === "over_request_rate_limit" ||
    e?.code === "over_email_send_rate_limit"
  );
}

export function signInErrorMessage(e: AuthErrorLike): string {
  if (isRateLimited(e)) return "Too many attempts. Wait a few minutes and try again.";
  if (e?.code === "email_not_confirmed") {
    return "Your email isn't confirmed yet. Use the link we sent you, or ask for a new one below.";
  }
  if (e?.code === "invalid_credentials") {
    return "Email or password is incorrect. If you were invited and haven't set a password yet, choose “Forgot your password?” below to set one.";
  }
  return "We couldn't sign you in. Try again in a moment.";
}

export function passwordUpdateErrorMessage(e: AuthErrorLike): string {
  if (isRateLimited(e)) return "Too many attempts. Wait a few minutes and try again.";
  if (e?.code === "same_password") {
    return "Choose a password you haven't used on this account before.";
  }
  if (e?.code === "weak_password") {
    return "That password is too weak. Use a longer, less common password.";
  }
  return "We couldn't update your password. Try again.";
}

export function signUpErrorMessage(e: AuthErrorLike): string {
  if (isRateLimited(e)) return "Too many attempts. Wait a few minutes and try again.";
  if (e?.code === "signup_disabled") {
    return "Sign-up is closed. New students join through an invitation from the coaching team.";
  }
  if (e?.code === "weak_password") {
    return "That password is too weak. Use a longer, less common password.";
  }
  if (e?.code === "email_address_invalid") return "Enter a valid email address.";
  return "We couldn't create your account. Try again in a moment.";
}
