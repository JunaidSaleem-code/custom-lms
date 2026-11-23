// Server client for Server Components, route handlers and server actions.
// Acts as the logged-in user (session cookie), so RLS applies.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublishableKey, getSupabaseUrl } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getPublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies cannot be set. Middleware refreshes the session.
        }
      },
    },
  });
}
