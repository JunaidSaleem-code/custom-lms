"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
};

// Disables itself while its parent form is submitting, so users can't double-submit.
export function SubmitButton({ children, pendingLabel, className = "btn btn-primary" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
