"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import { getSiteUrl } from "@/lib/site";
import { safeNextPath } from "@/lib/navigation/safe-path";
import {
  changePasswordSchema,
  emailSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "./schemas";
import {
  isRateLimited,
  passwordUpdateErrorMessage,
  signInErrorMessage,
  signUpErrorMessage,
} from "./errors";
import { isSignupEnabled } from "./config";
import { clearAuthFlow, getAuthFlow } from "./flow";

// Same wording for sign-up and resend, so the response never reveals whether an email is registered.
const SIGNUP_SENT_MESSAGE =
  "Check your email to confirm your account. If you don't see it within a few minutes, check your spam folder or ask for a new link.";
const RESEND_SENT_MESSAGE =
  "If that account is waiting for confirmation, we've sent a new link. Check your inbox and spam folder.";

// Same message whether or not the email has an account, so the form can't be used to find members.
const RESET_SENT_MESSAGE =
  "If an account exists for that email, we've sent a reset link. Check your inbox and spam folder.";

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return {
      error: signInErrorMessage(error),
      resendEmail: error.code === "email_not_confirmed" ? parsed.data.email : undefined,
    };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSignupEnabled()) {
    return { error: "Sign-up is closed. New students join through an invitation from the coaching team." };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) return { error: signUpErrorMessage(error) };

  // Same response for new and existing emails (Supabase returns no error for an existing address),
  // so this form can't be used to find members.
  return { success: SIGNUP_SENT_MESSAGE };
}

export async function resendConfirmationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
  if (error && isRateLimited(error)) {
    return { error: "Please wait a minute before asking for another link." };
  }
  return { success: RESEND_SENT_MESSAGE };
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error && isRateLimited(error)) {
    return { error: "Too many requests. Wait a few minutes and try again." };
  }
  // Other errors are not shown, to keep the response identical for every email address.
  return { success: RESET_SENT_MESSAGE };
}

// Used by the invite page and the reset page. Requires a session created by /auth/confirm.
export async function setPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the password and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Requires a link verified in this browser (see /auth/confirm). A plain login session isn't enough.
  const flow = await getAuthFlow();
  if (!user || !flow) redirect("/auth/error?reason=expired");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: passwordUpdateErrorMessage(error) };

  // Other devices must sign in again with the new password. This device stays signed in.
  await supabase.auth.signOut({ scope: "others" });
  await clearAuthFlow();
  redirect("/learn");
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // Re-verify the current password before allowing a change (protects against a hijacked session).
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    if (isRateLimited(verifyError)) {
      return { error: "Too many attempts. Wait a few minutes and try again." };
    }
    return { error: "Your current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: passwordUpdateErrorMessage(error) };

  // A changed password should lock out other sessions that may hold the old credentials.
  await supabase.auth.signOut({ scope: "others" });
  return { success: "Your password has been updated. You were signed out of your other devices." };
}

// Signs out this device only. Pass scope "global" to end every session.
export async function signOutAction(formData: FormData) {
  const everywhere = formData.get("everywhere") === "on";
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: everywhere ? "global" : "local" });
  redirect("/login");
}
