import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Use in every protected server component or action. Redirects if there is no valid session.
export async function requireUser() {
  // Marks the caller as request-time. Protected pages depend on the current user and clock,
  // so they must never be prerendered at build time.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}
