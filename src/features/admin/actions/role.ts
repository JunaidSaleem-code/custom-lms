"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// DEV ONLY. Flips the signed-in account between student and admin from the top-bar switch.
// Disabled in production: there, admin is granted only with scripts/set-admin.mjs.
export async function switchRoleAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Role switching is disabled in production.");
  }

  const role = formData.get("role");
  if (role !== "student" && role !== "admin") throw new Error("Unknown role.");

  const { user } = await requireUser();
  const { error } = await createAdminClient().from("profiles").update({ role }).eq("id", user.id);
  if (error) throw new Error(error.message);

  redirect(role === "admin" ? "/admin" : "/learn");
}
