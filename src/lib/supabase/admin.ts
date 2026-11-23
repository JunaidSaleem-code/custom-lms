// Admin client with the SECRET key. Bypasses RLS.
// Use only in trusted server code (webhooks, admin actions) after checking the caller is an admin.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY in .env.local");
  return createClient(getSupabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
