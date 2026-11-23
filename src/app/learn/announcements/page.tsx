import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/features/auth/session";
import { listAnnouncements } from "@/features/announcements/queries";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const { supabase } = await requireUser();
  const announcements = await listAnnouncements(supabase);

  return (
    <>
      <PageHeader
        eyebrow="Updates"
        title="Announcements"
        description="News from Nick and the team, including new modules and program updates."
      />

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet">
          <p>New announcements will appear here.</p>
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {announcements.map((a) => (
            <li key={a.id} className={`card ${styles.item}`}>
              <div className={styles.head}>
                <h2>{a.title}</h2>
                {a.community_id && <StatusBadge tone="brand">Community</StatusBadge>}
              </div>
              <p className={styles.date}>
                <LocalTime iso={a.published_at} kind="datetime" />
              </p>
              <p className={styles.body}>{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
