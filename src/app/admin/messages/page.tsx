import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/features/admin/guard";
import { listStudentOptions, listThreadsAdmin } from "@/features/admin/queries/communications";
import { ThreadForm } from "@/features/admin/components/communication-forms";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const { db } = await requireAdmin();
  const [threads, students] = await Promise.all([listThreadsAdmin(db), listStudentOptions(db)]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Messages"
        description="Private conversations between you and each student. Start one here, then reply from the thread."
      />

      <section className={`card ${styles.panel} ${styles.gapBelow}`} aria-labelledby="new-thread-heading">
        <h2 id="new-thread-heading">Start a conversation</h2>
        {students.length === 0 ? (
          <p>No students yet. Invite a student first.</p>
        ) : (
          <ThreadForm students={students.map((s) => ({ id: s.id, name: s.full_name ?? "Student" }))} />
        )}
      </section>

      {threads.length === 0 ? (
        <EmptyState title="No conversations yet">
          <p>Each student has one thread with you. It appears here once it is started.</p>
        </EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Conversations with students</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Started</th>
                <th scope="col">People</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/admin/messages/${t.id}`}>{t.title || "Conversation"}</Link>
                  </td>
                  <td>
                    <LocalTime iso={t.created_at} kind="date" />
                  </td>
                  <td className={styles.num}>{(t.conversation_participants as unknown[] | null)?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
