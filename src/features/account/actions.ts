"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/session";
import type { FormState } from "@/lib/form-state";
import { profileSchema } from "./schemas";

// Students may only change their own name and phone (the grant on profiles enforces the column list).
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) return { error: "Your details could not be saved. Try again." };

  revalidatePath("/learn", "layout");
  return { success: "Your details have been saved." };
}
