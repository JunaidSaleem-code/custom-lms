"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";

// Catches unexpected errors inside /learn. Logs the error (without exposing details to the student) and offers a retry.
export default function LearnError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Learn area error:", error.digest ?? error.message);
  }, [error]);

  return (
    <EmptyState title="Something went wrong">
      <p>We couldn&apos;t load this page. Your progress is saved. Try again, and if it keeps happening, contact the team.</p>
      <div style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </EmptyState>
  );
}
