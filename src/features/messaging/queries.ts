import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ThreadSummary = {
  id: string;
  title: string;
  unreadCount: number;
};

export type MessageView = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string | null;
  senderName: string;
  isMine: boolean;
};

// The student's threads with an unread count per thread. RLS limits results to their own threads.
export async function listThreads(supabase: SupabaseClient, userId: string): Promise<ThreadSummary[]> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, conversations(id, title, created_at)")
    .eq("user_id", userId);
  if (error) throw new Error(`Could not load conversations: ${error.message}`);

  type Row = {
    conversation_id: string;
    last_read_at: string | null;
    conversations: { id: string; title: string | null; created_at: string } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.conversations);

  // Count unread messages per thread. Fine for a small number of threads per student.
  const counts = await Promise.all(
    rows.map(async (r) => {
      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", r.conversation_id)
        .neq("sender_id", userId)
        .is("deleted_at", null);
      if (r.last_read_at) query = query.gt("created_at", r.last_read_at);
      const { count } = await query;
      return count ?? 0;
    }),
  );

  return rows
    .map((r, i) => ({
      id: r.conversation_id,
      title: r.conversations?.title ?? "Message from the coaching team",
      unreadCount: counts[i],
      createdAt: r.conversations?.created_at ?? "",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, title, unreadCount }) => ({ id, title, unreadCount }));
}

export async function getThread(supabase: SupabaseClient, conversationId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(`Could not load conversation: ${error.message}`);
  return data;
}

// Latest 200 messages, oldest first. Older history is out of scope for this version.
export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<MessageView[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load messages: ${error.message}`);

  const rows = (data ?? []).reverse();
  const senderIds = [...new Set(rows.map((m) => m.sender_id).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: people, error: peopleError } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", senderIds);
    if (peopleError) throw new Error(`Could not load senders: ${peopleError.message}`);
    for (const p of people ?? []) names.set(p.id, p.full_name ?? "Member");
  }

  return rows.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    senderId: m.sender_id,
    senderName: m.sender_id === userId ? "You" : m.sender_id ? names.get(m.sender_id) ?? "Coaching team" : "Former member",
    isMine: m.sender_id === userId,
  }));
}
