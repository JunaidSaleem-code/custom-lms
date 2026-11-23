import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
  community_id: string | null;
};

// RLS returns only published announcements the student is allowed to see.
export async function listAnnouncements(supabase: SupabaseClient, limit = 50): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, published_at, community_id")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load announcements: ${error.message}`);
  return (data ?? []) as Announcement[];
}
