import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { listCommunities } from "@/features/admin/queries/catalogue";
import { CommunityForm } from "@/features/admin/components/catalogue-forms";
import { plural } from "@/lib/format";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Communities" };

export default async function AdminCommunitiesPage() {
  const { db } = await requireAdmin();
  const communities = await listCommunities(db);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Communities"
        description="Separate communities for each membership tier. Students only see the communities their plan is linked to. Link them from the Plans page."
      />

      <section className={`card ${styles.panel} ${styles.gapBelow}`} aria-labelledby="new-community-heading">
        <h2 id="new-community-heading">New community</h2>
        <CommunityForm />
      </section>

      {communities.length === 0 ? (
        <EmptyState title="No communities yet">
          <p>Create one community per tier, for example Basic, Full Course, Mentorship and Inner Circle.</p>
        </EmptyState>
      ) : (
        <div className={styles.list}>
          {communities.map((c) => (
            <section key={c.id} className={`card ${styles.item}`} aria-labelledby={`community-${c.id}`}>
              <div className={styles.itemHead}>
                <div>
                  <h2 id={`community-${c.id}`}>{c.name}</h2>
                  <p className="hint">
                    Linked to {plural(c.planCount, "plan")} · /{c.slug}
                  </p>
                </div>
                {c.is_active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Hidden</StatusBadge>}
              </div>
              <details className={styles.details}>
                <summary className={styles.summary}>Edit community</summary>
                <div className={styles.detailsBody}>
                  <CommunityForm community={{ id: c.id, name: c.name, slug: c.slug, description: c.description, is_active: c.is_active }} />
                </div>
              </details>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
