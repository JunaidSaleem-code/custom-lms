import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { getOwnProfile } from "@/features/account/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAdminAccess } from "./access";

// Use at the top of every admin page and action. Non-admins are sent to the student dashboard.
// Data access then uses the secret-key client, so every admin query must be scoped carefully.
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const profile = await getOwnProfile(supabase, user.id);
  if (!hasAdminAccess(profile)) redirect("/learn");
  return { user, profile: profile!, db: createAdminClient() };
}
