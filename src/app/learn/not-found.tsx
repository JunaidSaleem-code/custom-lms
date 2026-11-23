import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

// Used for missing pages and for content the student can't access. The two are deliberately
// indistinguishable, so the response never reveals whether a hidden course exists.
export default function LearnNotFound() {
  return (
    <EmptyState title="We couldn't find that page">
      <p>It may have moved, or it may not be part of your membership.</p>
      <p>
        <Link href="/learn" className="btn btn-primary" style={{ marginTop: 12 }}>
          Back to dashboard
        </Link>
      </p>
    </EmptyState>
  );
}
