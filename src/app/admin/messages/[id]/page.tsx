import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/features/admin/guard";
import { getThreadAdmin } from "@/features/admin/queries/communications";
import { ReplyForm } from "@/features/admin/components/communication-forms";
import styles from "../../admin.module.css";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { db } = await requireAdmin();
  const thread = await getThreadAdmin(db, id);
  return { title: thread?.title ?? "Conversation" };
}

export default async function AdminThreadPage({ params }: Props) {
  const { id } = await params;
  const { db, user } = await requireAdmin();
  const thread = await getThreadAdmin(db, id);
  if (!thread) notFound();

  return (
    <>
      <p className={styles.gapSmall}>
        <Link href="/admin/messages" className="hint">
          ← All conversations
        </Link>
      </p>
      <PageHeader
        eyebrow="Conversation"
        title={thread.title || "Conversation"}
        description={`With ${thread.participants
          .filter((p) => p.id !== user.id)
          .map((p) => p.name)
          .join(", ") || "no one yet"}.`}
      />

      <section className={`card ${styles.panel}`} aria-labelledby="thread-heading">
        <h2 id="thread-heading">Messages</h2>
        {thread.messages.length === 0 ? (
          <EmptyState title="No messages yet" />
        ) : (
          <div className={styles.thread}>
            {thread.messages.map((m) => (
              <div key={m.id} className={`${styles.bubble} ${m.senderId === user.id ? styles.bubbleAdmin : ""}`}>
                <span className={styles.bubbleMeta}>
                  {m.senderId === user.id ? "You" : m.senderName} · <LocalTime iso={m.created_at} />
                </span>
                <span className={styles.bubbleText}>{m.body}</span>
              </div>
            ))}
          </div>
        )}
        <ReplyForm conversationId={thread.id} />
      </section>
    </>
  );
}
