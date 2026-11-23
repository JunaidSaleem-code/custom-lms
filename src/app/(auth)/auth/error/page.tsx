import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Link problem" };

type Props = { searchParams: Promise<{ reason?: string }> };

const MESSAGES: Record<string, { title: string; body: string; action: { href: string; label: string } }> = {
  expired: {
    title: "This link has expired",
    body: "Links are valid for a limited time and can only be used once.",
    action: { href: "/forgot-password", label: "Request a new link" },
  },
  invalid: {
    title: "This link isn't valid",
    body: "The link may be incomplete or was copied incorrectly. Open the most recent email and try again.",
    action: { href: "/login", label: "Back to sign in" },
  },
  "no-profile": {
    title: "Your account isn't ready yet",
    body: "We couldn't find your member profile. Please contact the Sales Coaching team.",
    action: { href: "/login", label: "Back to sign in" },
  },
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason ?? ""] ?? MESSAGES.invalid;
  return (
    <>
      <header>
        <h1>{message.title}</h1>
        <p>{message.body}</p>
      </header>
      <Link href={message.action.href} className="btn btn-primary">
        {message.action.label}
      </Link>
    </>
  );
}

// Personal, per-request content: render on the server for each visit (not part of the static shell).
export const instant = false;
