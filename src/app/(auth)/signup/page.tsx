import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/features/auth/components/signup-form";
import { isSignupEnabled } from "@/features/auth/config";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  // Closed sign-up gets a clear page rather than a form that would fail on submit.
  if (!isSignupEnabled()) {
    return (
      <>
        <header>
          <h1>Sign-up is closed</h1>
          <p>New students join through an invitation from the coaching team. Check your email for your invitation link.</p>
        </header>
        <Link href="/login" className="btn btn-ghost">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <header>
        <h1>Create an account</h1>
        <p>We&apos;ll email you a link to confirm your address before you sign in.</p>
      </header>
      <SignUpForm />
    </>
  );
}

// Personal, per-request content: render on the server for each visit (not part of the static shell).
export const instant = false;
