// Browser client. Uses the publishable key; RLS limits what it can read.
import { createBrowserClient } from "@supabase/ssr";
import { getPublishableKey, getSupabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getPublishableKey());
}
