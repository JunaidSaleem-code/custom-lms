import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { listAnnouncementsAdmin } from "@/features/admin/queries/communications";
import { listCommunities } from "@/features/admin/queries/catalogue";
import { AnnouncementForm, PublishToggle } from "@/features/admin/components/communication-forms";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const { db } = await requireAdmin();
  const [announcements, communities] = await Promise.all([listAnnouncementsAdmin(db), listCommunities(db)]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Announcements"
        description="Messages to every student or to one community. Use them for new modules, group calls and programme updates."
      />

      <section className={`card ${styles.panel} ${styles.gapBelow}`} aria-labelledby="new-announcement-heading">
        <h2 id="new-announcement-heading">New announcement</h2>
        <AnnouncementForm communities={communities.map((c) => ({ id: c.id, name: c.name }))} />
      </section>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet">
          <p>Announcements you publish appear on the students&apos; announcements page.</p>
        </EmptyState>
      ) : (
        <div className={styles.list}>
          {announcements.map((a) => {
            const audience = (a.communities as unknown as { name: string } | null)?.name ?? "Every student";
            const published = Boolean(a.published_at);
            return (
              <article key={a.id} className={`card ${styles.item}`} aria-labelledby={`ann-${a.id}`}>
                <div className={styles.itemHead}>
                  <div>
                    <h2 id={`ann-${a.id}`}>{a.title}</h2>
                    <p className="hint">
                      For {audience} · created <LocalTime iso={a.created_at} kind="date" />
                      {published && a.published_at ? (
                        <>
                          {" "}· published <LocalTime iso={a.published_at} />
                        </>
                      ) : null}
                    </p>
                  </div>
                  {published ? <StatusBadge tone="success">Published</StatusBadge> : <StatusBadge tone="neutral">Draft</StatusBadge>}
                </div>
                <p className={styles.body}>{a.body}</p>
                <PublishToggle id={a.id} published={published} />
              </article>
            );
          })}
        </div>
      )}

    </>
  );
}
