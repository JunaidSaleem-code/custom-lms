import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listAnnouncementsAdmin(db: SupabaseClient) {
  const { data, error } = await db
    .from("announcements")
    .select("id, title, body, community_id, published_at, created_at, communities(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCallsAdmin(db: SupabaseClient) {
  const { data, error } = await db
    .from("group_calls")
    .select("id, title, description, starts_at, duration_minutes, join_url, community_id, communities(name)")
    .order("starts_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listThreadsAdmin(db: SupabaseClient) {
  const { data, error } = await db
    .from("conversations")
    .select("id, title, created_at, conversation_participants(user_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getThreadAdmin(db: SupabaseClient, id: string) {
  const [conv, messages] = await Promise.all([
    db.from("conversations").select("id, title, conversation_participants(user_id)").eq("id", id).maybeSingle(),
    db.from("messages").select("id, body, created_at, sender_id").eq("conversation_id", id).order("created_at").limit(500),
  ]);
  if (conv.error) throw new Error(conv.error.message);
  if (messages.error) throw new Error(messages.error.message);
  if (!conv.data) return null;

  const ids = [...new Set((conv.data.conversation_participants as { user_id: string }[]).map((p) => p.user_id))];
  const { data: people } = await db.from("profiles").select("id, full_name").in("id", ids);
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name ?? "Member"]));

  return {
    id: conv.data.id,
    title: conv.data.title,
    participants: ids.map((id) => ({ id, name: names.get(id) ?? "Member" })),
    messages: (messages.data ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      senderName: m.sender_id ? names.get(m.sender_id) ?? "Member" : "Former member",
    })),
  };
}

export async function listStudentOptions(db: SupabaseClient) {
  const { data, error } = await db.from("profiles").select("id, full_name").eq("role", "student").order("full_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
