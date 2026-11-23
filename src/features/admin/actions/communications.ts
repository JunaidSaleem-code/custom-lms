"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "../guard";
import type { FormState } from "@/lib/form-state";

const uuid = z.uuid({ error: "Invalid id." });
const optionalCommunity = z.union([z.literal(""), uuid]);

// ---------------------------------------------------------------- announcements

export async function saveAnnouncementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, db } = await requireAdmin();
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Give the announcement a title.").max(160),
      body: z.string().trim().min(1, "Write the announcement.").max(5000),
      communityId: optionalCommunity,
    })
    .safeParse({
      title: formData.get("title"),
      body: formData.get("body"),
      communityId: formData.get("communityId") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the announcement." };

  const publishNow = formData.get("publishNow") === "on";
  const { error } = await db.from("announcements").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    community_id: parsed.data.communityId || null,
    author_id: user.id,
    published_at: publishNow ? new Date().toISOString() : null,
  });
  if (error) return { error: "The announcement could not be saved." };

  revalidatePath("/admin/announcements");
  return { success: publishNow ? "Announcement published." : "Saved as a draft." };
}

export async function setAnnouncementPublishedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({ id: uuid, publish: z.enum(["yes", "no"]) })
    .safeParse({ id: formData.get("id"), publish: formData.get("publish") });
  if (!parsed.success) return { error: "That announcement can't be changed." };

  const { error } = await db
    .from("announcements")
    .update({ published_at: parsed.data.publish === "yes" ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return { error: "The announcement could not be updated." };

  revalidatePath("/admin/announcements");
  return { success: parsed.data.publish === "yes" ? "Published." : "Moved back to drafts." };
}

// ---------------------------------------------------------------- group calls

// startsAt is an ISO timestamp produced in the admin's browser (see DateTimeLocalInput), so it has the right time zone.
export async function saveCallAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, db } = await requireAdmin();
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Give the call a title.").max(160),
      description: z.string().trim().max(2000).optional(),
      communityId: optionalCommunity,
      startsAt: z.iso.datetime({ offset: true, error: "Choose a date and time for the call." }),
      durationMinutes: z.coerce.number().int("Duration must be whole minutes.").min(5, "Calls must be at least 5 minutes.").max(600),
      joinUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "The join link must start with https://." })]),
    })
    .safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      communityId: formData.get("communityId") ?? "",
      startsAt: formData.get("startsAt"),
      durationMinutes: formData.get("durationMinutes"),
      joinUrl: formData.get("joinUrl") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the call details." };

  const { error } = await db.from("group_calls").insert({
    title: parsed.data.title,
    description: parsed.data.description || null,
    community_id: parsed.data.communityId || null,
    starts_at: parsed.data.startsAt,
    duration_minutes: parsed.data.durationMinutes,
    join_url: parsed.data.joinUrl || null,
    created_by: user.id,
  });
  if (error) return { error: "The call could not be scheduled." };

  revalidatePath("/admin/calls");
  return { success: "Call scheduled." };
}

// ---------------------------------------------------------------- messages

// Starts a one-to-one thread with a student. The admin is added as a participant so the thread shows
// their side too. The thread title is the student's name, so the admin list is readable.
export async function createThreadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, db } = await requireAdmin();
  const parsed = z
    .object({
      studentId: uuid,
      body: z.string().trim().min(1, "Write the first message.").max(2000, "Messages can be up to 2000 characters."),
    })
    .safeParse({ studentId: formData.get("studentId"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the message." };

  const { data: student } = await db
    .from("profiles")
    .select("full_name, role")
    .eq("id", parsed.data.studentId)
    .maybeSingle();
  if (!student || student.role !== "student") return { error: "Choose a student." };

  const { data: conversation, error } = await db
    .from("conversations")
    .insert({ title: student.full_name ?? "Student" })
    .select("id")
    .single();
  if (error || !conversation) return { error: "The conversation could not be started." };

  const { error: participantError } = await db.from("conversation_participants").insert([
    { conversation_id: conversation.id, user_id: parsed.data.studentId },
    { conversation_id: conversation.id, user_id: user.id },
  ]);
  if (participantError) return { error: "The conversation could not be started." };

  const { error: messageError } = await db.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (messageError) return { error: "The conversation was started, but the first message could not be sent." };

  revalidatePath("/admin/messages");
  return { success: "Conversation started." };
}

export async function sendAdminMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, db } = await requireAdmin();
  const parsed = z
    .object({
      conversationId: uuid,
      body: z.string().trim().min(1, "Write a message before sending.").max(2000, "Messages can be up to 2000 characters."),
    })
    .safeParse({ conversationId: formData.get("conversationId"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the message." };

  const { error } = await db.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: "Your message could not be sent. Try again." };

  revalidatePath(`/admin/messages/${parsed.data.conversationId}`);
  return { success: "Sent." };
}
