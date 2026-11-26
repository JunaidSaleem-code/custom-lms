import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/features/auth/session";
import { listMyCommunities } from "@/features/community/queries";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityIndexPage() {
  const { supabase } = await requireUser();
  const communities = await listMyCommunities(supabase);

  // A single community is the common case: go straight to it.
  if (communities.length === 1) redirect(`/learn/community/${communities[0].slug}`);

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Your communities"
        description="Communities are linked to your membership plan."
      />

      {communities.length === 0 ? (
        <EmptyState title="You are not in a community yet">
          <p>
            Communities open with your membership plan. If you have just joined, it can take a few minutes to appear.
          </p>
        </EmptyState>
      ) : (
        <ul className={styles.grid}>
          {communities.map((c) => (
            <li key={c.id}>
              <Link href={`/learn/community/${c.slug}`} className={`card ${styles.card}`}>
                <h2>{c.name}</h2>
                {c.description && <p>{c.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
