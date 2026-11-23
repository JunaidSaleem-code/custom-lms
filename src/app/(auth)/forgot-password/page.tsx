import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <header>
        <h1>Reset your password</h1>
        <p>Enter the email on your account and we&apos;ll send you a link to choose a new password.</p>
      </header>
      <ForgotPasswordForm />
    </>
  );
}
