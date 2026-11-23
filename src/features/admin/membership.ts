import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Gives an account a membership in a plan, using the plan's access duration (null = no expiry).
// Used by manual grants now and by the purchase sync later, so the rule lives in one place.
export async function grantMembership(
  db: SupabaseClient,
  userId: string,
  planId: string,
  source: "manual" | "stripe" = "manual",
  sourceRef: string | null = null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: plan, error: planError } = await db
    .from("plans")
    .select("access_duration_days, is_active")
    .eq("id", planId)
    .maybeSingle();
  if (planError) return { ok: false, error: planError.message };
  if (!plan) return { ok: false, error: "That plan no longer exists." };
  if (!plan.is_active) return { ok: false, error: "That plan is not active. Activate it first." };

  const now = new Date();
  const days = plan.access_duration_days as number | null;
  const expires = days === null ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await db.from("enrollments").insert({
    user_id: userId,
    plan_id: planId,
    source,
    source_ref: sourceRef,
    status: "active",
    starts_at: now.toISOString(),
    expires_at: expires,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
