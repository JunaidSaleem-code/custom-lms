import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/features/auth/session";
import { getThread, listMessages } from "@/features/messaging/queries";
import { MessageForm } from "@/features/messaging/components/message-form";
import { MarkRead } from "@/features/messaging/components/mark-read";
import styles from "./page.module.css";

type Props = { params: Promise<{ id: string }> };

const uuid = z.uuid();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return { title: "Messages" };
  const { supabase } = await requireUser();
  const thread = await getThread(supabase, id);
  return { title: thread?.title ?? "Messages" };
}

export default async function ThreadPage({ params }: Props) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const { supabase, user } = await requireUser();
  // Null when the student isn't a participant (RLS), so other students' threads can't be opened.
  const thread = await getThread(supabase, id);
  if (!thread) notFound();

  const messages = await listMessages(supabase, id, user.id);

  return (
    <>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/learn/messages">Messages</Link>
        <span aria-hidden="true">/</span>
        <span>{thread.title}</span>
      </nav>
      <PageHeader eyebrow="Conversation" title={thread.title ?? "Conversation"} />

      <MarkRead conversationId={id} />

      <section className={styles.thread} aria-label="Messages" aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet">
            <p>Send the first message below.</p>
          </EmptyState>
        ) : (
          <ol className={styles.messages}>
            {messages.map((m) => (
              <li key={m.id} className={`${styles.bubble} ${m.isMine ? styles.mine : styles.theirs}`}>
                <div className={styles.meta}>
                  <span className={styles.sender}>{m.senderName}</span>
                  <span className="hint">
                    <LocalTime iso={m.createdAt} kind="datetime" />
                  </span>
                </div>
                <p className={styles.text}>{m.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={`card ${styles.composer}`} aria-label="Reply">
        <MessageForm conversationId={id} />
      </section>
    </>
  );
}
