import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import { isSignupEnabled } from "@/features/auth/config";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const signupEnabled = isSignupEnabled();

  return (
    <>
      <header>
        <h1>Welcome back</h1>
        <p>Sign in to continue learning.</p>
      </header>
      <LoginForm next={next} />
      {!signupEnabled && (
        <p className="hint">
          New students join through an invitation from the coaching team. Check your email for your invitation link.
        </p>
      )}
    </>
  );
}

// Personal, per-request content: render on the server for each visit (not part of the static shell).
export const instant = false;
