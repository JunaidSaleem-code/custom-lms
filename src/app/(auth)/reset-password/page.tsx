import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { getAuthFlow } from "@/features/auth/flow";

export const metadata: Metadata = { title: "Set password" };

// Reached only through /auth/confirm, which sets the flow cookie. Without it, this page
// can't change a password, even for a user who is logged in.
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const flow = await getAuthFlow();

  // A signed-in member who opens this page directly has nothing to set up. Send them to their account.
  if (user && !flow) redirect("/learn/account");

  if (!user || !flow) {
    return (
      <>
        <header>
          <h1>This link has expired</h1>
          <p>For security, reset links can only be used once and expire after a short time.</p>
        </header>
        <Link href="/forgot-password" className="btn btn-primary">
          Request a new link
        </Link>
      </>
    );
  }

  const isInvite = flow === "invite";
  return (
    <>
      <header>
        <h1>{isInvite ? "Welcome" : "Choose a new password"}</h1>
        <p>
          {isInvite
            ? "Create a password to activate your account. You'll use it to sign in from now on."
            : "Your new password takes effect straight away. You'll be signed out of other devices."}
        </p>
      </header>
      <SetPasswordForm mode={isInvite ? "invite" : "reset"} />
    </>
  );
}

// Personal, per-request content: render on the server for each visit (not part of the static shell).
export const instant = false;
