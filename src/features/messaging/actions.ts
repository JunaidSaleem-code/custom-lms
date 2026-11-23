"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import type { FormState } from "@/lib/form-state";
import type { ActionResult } from "@/lib/action-result";

import { MAX_MESSAGE_LENGTH } from "./constants";

const sendSchema = z.object({
  conversationId: z.uuid({ error: "Invalid conversation." }),
  body: z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(MAX_MESSAGE_LENGTH, `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`),
});

export async function sendMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sendSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your message and try again." };

  const { supabase, user } = await requireUser();
  // RLS allows the insert only into threads the student belongs to, and only as themselves.
  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: "Your message could not be sent. Try again." };

  revalidatePath(`/learn/messages/${parsed.data.conversationId}`);
  return { success: "Sent." };
}

// Marks a thread as read for the current student (drives the unread count).
export async function markThreadReadAction(conversationId: string): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "Invalid conversation." };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", parsed.data)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not update read status." };
  return { ok: true };
}
