"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import type { FormState } from "@/lib/form-state";

import { MAX_POST_LENGTH } from "./constants";

const postSchema = z.object({
  communityId: z.uuid({ error: "Invalid community." }),
  communitySlug: z.string().min(1).max(100),
  body: z
    .string()
    .trim()
    .min(1, "Write something before posting.")
    .max(MAX_POST_LENGTH, `Posts can be up to ${MAX_POST_LENGTH} characters.`),
});

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = postSchema.safeParse({
    communityId: formData.get("communityId"),
    communitySlug: formData.get("communitySlug"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your post and try again." };

  const { supabase, user } = await requireUser();
  // RLS allows the insert only when the author is the current user and they are a member.
  const { error } = await supabase.from("community_posts").insert({
    community_id: parsed.data.communityId,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) {
    return { error: "You can't post in this community right now." };
  }

  revalidatePath(`/learn/community/${parsed.data.communitySlug}`);
  return { success: "Posted." };
}

// Soft delete: the row stays for moderation and reporting, but disappears from the feed.
export async function deletePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      postId: z.uuid(),
      communitySlug: z.string().min(1).max(100),
    })
    .safeParse({ postId: formData.get("postId"), communitySlug: formData.get("communitySlug") });
  if (!parsed.success) return { error: "That post can't be deleted." };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("community_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.postId);
  if (error) return { error: "Your post could not be deleted. Try again." };

  revalidatePath(`/learn/community/${parsed.data.communitySlug}`);
  return { success: "Post deleted." };
}
