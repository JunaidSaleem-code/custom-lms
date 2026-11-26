import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/features/auth/session";
import { listThreads } from "@/features/messaging/queries";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { supabase, user } = await requireUser();
  const threads = await listThreads(supabase, user.id);

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Messages"
        description="Private conversations with the Sales Coaching team."
      />

      {/* Placeholder (docs/PLACEHOLDERS.md #23): students cannot start conversations yet. */}
      <div className={styles.newThread}>
        <button type="button" className="btn btn-ghost" disabled title="Students can't start conversations yet">
          New conversation (coming soon)
        </button>
      </div>

      {threads.length === 0 ? (
        <EmptyState title="No conversations yet">
          <p>The Sales Coaching team will start a conversation with you here when needed.</p>
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/learn/messages/${t.id}`} className={`card ${styles.item}`}>
                <span className={styles.title}>{t.title}</span>
                {t.unreadCount > 0 && (
                  <StatusBadge tone="brand">
                    {t.unreadCount} new
                  </StatusBadge>
                )}
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
