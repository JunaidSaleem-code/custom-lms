import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Community = { id: string; slug: string; name: string; description: string | null };

export type Post = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
};

export const POSTS_PAGE_SIZE = 20;

// Communities the student is entitled to. RLS hides the rest.
export async function listMyCommunities(supabase: SupabaseClient): Promise<Community[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("id, slug, name, description")
    .order("name");
  if (error) throw new Error(`Could not load communities: ${error.message}`);
  return data ?? [];
}

export async function getCommunityBySlug(supabase: SupabaseClient, slug: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from("communities")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load community: ${error.message}`);
  return data;
}

// Newest first. Pass `before` (an ISO timestamp from the last post shown) to load the next page.
export async function listPosts(
  supabase: SupabaseClient,
  communityId: string,
  before?: string,
): Promise<{ posts: Post[]; hasMore: boolean }> {
  let query = supabase
    .from("community_posts")
    .select("id, body, created_at, author_id")
    .eq("community_id", communityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(POSTS_PAGE_SIZE + 1);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load posts: ${error.message}`);

  const rows = data ?? [];
  const hasMore = rows.length > POSTS_PAGE_SIZE;
  const page = rows.slice(0, POSTS_PAGE_SIZE);

  // Names come from the public-safe view, because community_posts has no direct link to it.
  const authorIds = [...new Set(page.map((p) => p.author_id).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: people, error: peopleError } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", authorIds);
    if (peopleError) throw new Error(`Could not load authors: ${peopleError.message}`);
    for (const p of people ?? []) names.set(p.id, p.full_name ?? "Member");
  }

  return {
    hasMore,
    posts: page.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at,
      authorId: p.author_id,
      authorName: p.author_id ? names.get(p.author_id) ?? "Former member" : "Former member",
    })),
  };
}
