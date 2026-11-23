import "server-only";

// Public sign-up is off unless SIGNUP_ENABLED=true AND "Allow new users to sign up" is on in Supabase.
// Both must match: the app setting controls the UI, the Supabase setting controls the backend.
export function isSignupEnabled(): boolean {
  return process.env.SIGNUP_ENABLED === "true";
}
