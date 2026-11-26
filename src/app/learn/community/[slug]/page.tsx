import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/features/auth/session";
import { getCommunityBySlug, listMyCommunities, listPosts } from "@/features/community/queries";
import { PostForm } from "@/features/community/components/post-form";
import { DeletePostButton } from "@/features/community/components/delete-post-button";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ before?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const community = await getCommunityBySlug(supabase, slug);
  return { title: community?.name ?? "Community" };
}

export default async function CommunityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { before } = await searchParams;
  const { supabase, user } = await requireUser();

  // RLS hides communities the student isn't entitled to, so this is null for them.
  const community = await getCommunityBySlug(supabase, slug);
  if (!community) notFound();

  const [feed, mine] = await Promise.all([
    listPosts(supabase, community.id, before),
    listMyCommunities(supabase),
  ]);
  const last = feed.posts.at(-1);

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title={community.name}
        description={community.description ?? undefined}
        actions={
          mine.length > 1 ? (
            <nav aria-label="Switch community" className={styles.switcher}>
              {mine.map((c) => (
                <Link
                  key={c.id}
                  href={`/learn/community/${c.slug}`}
                  className={styles.pill}
                  aria-current={c.id === community.id ? "page" : undefined}
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : undefined
        }
      />

      <section className={`card ${styles.composer}`} aria-label="New post">
        <PostForm communityId={community.id} communitySlug={community.slug} />
      </section>

      {feed.posts.length === 0 ? (
        <EmptyState title="No posts yet">
          <p>Be the first to start a conversation.</p>
        </EmptyState>
      ) : (
        <ol className={styles.feed} aria-label="Posts">
          {feed.posts.map((p) => (
            <li key={p.id} className={`card ${styles.post}`}>
              <header className={styles.postHead}>
                <span className={styles.author}>{p.authorName}</span>
                <span className="hint">
                  <LocalTime iso={p.createdAt} kind="datetime" />
                </span>
              </header>
              <p className={styles.body}>{p.body}</p>
              {p.authorId === user.id ? (
                <div className={styles.actions}>
                  <DeletePostButton postId={p.id} communitySlug={community.slug} />
                </div>
              ) : (
                // Placeholder (docs/PLACEHOLDERS.md #24): reporting is not built yet.
                <div className={styles.actions}>
                  <button type="button" className="btn btn-ghost" disabled title="Reporting is coming soon">
                    Report (coming soon)
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {feed.hasMore && last && (
        <nav className={styles.more} aria-label="Pagination">
          <Link
            href={`/learn/community/${community.slug}?before=${encodeURIComponent(last.createdAt)}`}
            className="btn btn-ghost"
          >
            Load older posts
          </Link>
        </nav>
      )}
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
