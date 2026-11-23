import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallRow } from "./status";

// Calls starting in the last 12 hours or later. Use callWindow() to decide what to show for each one.
// RLS limits the list to calls for the student's communities or for all students.
export async function listRecentAndUpcomingCalls(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<CallRow[]> {
  const since = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("group_calls")
    .select("id, title, description, starts_at, duration_minutes, join_url, provider")
    .gte("starts_at", since)
    .order("starts_at")
    .limit(100);
  if (error) throw new Error(`Could not load group calls: ${error.message}`);
  return (data ?? []) as CallRow[];
}
