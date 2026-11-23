"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "../guard";
import { grantMembership } from "../membership";
import type { FormState } from "@/lib/form-state";
import { getSiteUrl } from "@/lib/site";

const uuid = z.uuid({ error: "Invalid id." });

export async function inviteStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      email: z.email({ error: "Enter a valid email address." }).max(254),
      fullName: z.string().trim().min(2, "Enter the student's full name.").max(80),
      planId: z.union([z.literal(""), uuid]),
    })
    .safeParse({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      fullName: formData.get("fullName"),
      planId: formData.get("planId") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { email, fullName, planId } = parsed.data;
  const { error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${getSiteUrl()}/auth/confirm`,
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { error: "That email already has an account. Open the student from the list, or send a password reset." };
    }
    return { error: `The invitation could not be sent: ${error.message}` };
  }

  // Invited students get the plan straight away, so they land on a working dashboard after they set a password.
  if (planId) {
    const created = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = created.data?.users.find((u) => u.email?.toLowerCase() === email);
    if (user) {
      const granted = await grantMembership(db, user.id, planId);
      if (!granted.ok) return { error: `Invitation sent, but the plan could not be assigned: ${granted.error}` };
    }
  }

  revalidatePath("/admin/students");
  return { success: `Invitation sent to ${email}.` };
}

export async function sendPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const id = uuid.safeParse(formData.get("userId"));
  if (!id.success) return { error: "Invalid student." };

  const { data } = await db.auth.admin.getUserById(id.data);
  const email = data.user?.email;
  if (!email) return { error: "This student has no email address on file." };

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: `The reset email could not be sent: ${error.message}` };
  return { success: `Password reset email sent to ${email}.` };
}

export async function grantPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z.object({ userId: uuid, planId: uuid }).safeParse({
    userId: formData.get("userId"),
    planId: formData.get("planId"),
  });
  if (!parsed.success) return { error: "Choose a plan." };

  const existing = await db
    .from("active_enrollments")
    .select("id")
    .eq("user_id", parsed.data.userId)
    .eq("plan_id", parsed.data.planId)
    .limit(1);
  if (existing.data && existing.data.length > 0) {
    return { error: "This student already has an active membership in that plan." };
  }

  const granted = await grantMembership(db, parsed.data.userId, parsed.data.planId);
  if (!granted.ok) return { error: granted.error };
  revalidatePath(`/admin/students/${parsed.data.userId}`);
  return { success: "Membership added." };
}

export async function revokeEnrollmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z.object({ enrollmentId: uuid, userId: uuid }).safeParse({
    enrollmentId: formData.get("enrollmentId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { error: "Invalid membership." };

  const { error } = await db.from("enrollments").update({ status: "revoked" }).eq("id", parsed.data.enrollmentId);
  if (error) return { error: "The membership could not be ended. Try again." };
  revalidatePath(`/admin/students/${parsed.data.userId}`);
  return { success: "Membership ended. The student has lost access to its courses." };
}

export async function extendEnrollmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      enrollmentId: uuid,
      userId: uuid,
      days: z.coerce.number().int("Enter whole days.").min(1, "Enter at least 1 day.").max(730, "Extend by 730 days at most."),
    })
    .safeParse({
      enrollmentId: formData.get("enrollmentId"),
      userId: formData.get("userId"),
      days: formData.get("days"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the number of days." };

  const current = await db.from("enrollments").select("expires_at").eq("id", parsed.data.enrollmentId).maybeSingle();
  if (!current.data) return { error: "That membership no longer exists." };
  if (current.data.expires_at === null) return { error: "This membership has no end date, so there is nothing to extend." };

  // Extend from the later of now and the current end date, so an expired membership restarts from today.
  const base = Math.max(Date.now(), new Date(current.data.expires_at).getTime());
  const next = new Date(base + parsed.data.days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await db
    .from("enrollments")
    .update({ expires_at: next, status: "active" })
    .eq("id", parsed.data.enrollmentId);
  if (error) return { error: "The membership could not be extended. Try again." };
  revalidatePath(`/admin/students/${parsed.data.userId}`);
  return { success: `Extended by ${parsed.data.days} days.` };
}

export async function removeStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, db } = await requireAdmin();
  const parsed = uuid.safeParse(formData.get("userId"));
  if (!parsed.success) return { error: "Invalid student." };
  if (parsed.data === user.id) return { error: "You can't remove your own account." };

  const target = await db.from("profiles").select("role").eq("id", parsed.data).maybeSingle();
  if (target.data?.role === "admin") {
    return { error: "Remove admin access first, then remove the account." };
  }

  const { error } = await db.auth.admin.deleteUser(parsed.data);
  if (error) return { error: `The account could not be removed: ${error.message}` };
  revalidatePath("/admin/students");
  redirect("/admin/students");
}
