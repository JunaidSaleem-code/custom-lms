import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/navigation/safe-path";
import { setAuthFlow } from "@/features/auth/flow";

// Verifies the one-time token from invite, reset, sign-up and sign-in emails.
// Uses the token_hash flow, which works across devices (no PKCE verifier cookie needed).
const ALLOWED_TYPES: ReadonlySet<EmailOtpType> = new Set<EmailOtpType>([
  "invite",
  "recovery",
  "email",
  "signup",
  "magiclink",
  "email_change",
]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !ALLOWED_TYPES.has(type)) {
    redirect("/auth/error?reason=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    // Expired and already-used links both report otp_expired. Anything else is a bad link.
    const reason = error.code === "otp_expired" ? "expired" : "invalid";
    redirect(`/auth/error?reason=${reason}`);
  }

  if (type === "invite") {
    await setAuthFlow("invite");
    redirect("/reset-password?welcome=1");
  }
  if (type === "recovery") {
    await setAuthFlow("recovery");
    redirect("/reset-password");
  }
  redirect(safeNextPath(params.get("next")));
}
