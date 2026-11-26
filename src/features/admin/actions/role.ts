"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// DEMO MODE. Flips the signed-in account between student and admin from the top-bar switch.
// Runs on every build, including production, so any signed-in account can become admin.
// Restore the production guard before real students use the site.
export async function switchRoleAction(formData: FormData) {
  const role = formData.get("role");
  if (role !== "student" && role !== "admin") throw new Error("Unknown role.");

  const { user } = await requireUser();
  const { error } = await createAdminClient().from("profiles").update({ role }).eq("id", user.id);
  if (error) throw new Error(error.message);

  redirect(role === "admin" ? "/admin" : "/learn");
}
