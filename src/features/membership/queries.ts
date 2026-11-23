import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveMembershipState, type EnrollmentRow, type MembershipState } from "./status";

// RLS limits this to the caller's own enrollments.
export async function getMembershipState(supabase: SupabaseClient): Promise<MembershipState> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("status, starts_at, expires_at, plans(name)")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(`Could not load membership: ${error.message}`);
  return deriveMembershipState((data ?? []) as unknown as EnrollmentRow[]);
}
