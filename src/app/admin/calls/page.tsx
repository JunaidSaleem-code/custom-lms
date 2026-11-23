import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { listCallsAdmin } from "@/features/admin/queries/communications";
import { listCommunities } from "@/features/admin/queries/catalogue";
import { CallForm } from "@/features/admin/components/communication-forms";
import { splitByStart } from "@/features/admin/input";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Group calls" };

export default async function AdminCallsPage() {
  await connection();
  const { db } = await requireAdmin();
  const [calls, communities] = await Promise.all([listCallsAdmin(db), listCommunities(db)]);

  const { upcoming, past } = splitByStart(calls);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Group calls"
        description="Schedule coaching calls. Students see them on their calls page, filtered by community."
      />

      <section className={`card ${styles.panel} ${styles.gapBelow}`} aria-labelledby="new-call-heading">
        <h2 id="new-call-heading">Schedule a call</h2>
        <CallForm communities={communities.map((c) => ({ id: c.id, name: c.name }))} />
      </section>

      <CallList heading="Upcoming" calls={upcoming} emptyText="No upcoming calls. Schedule one above." />
      <CallList heading="Past" calls={past} emptyText="No past calls yet." />
    </>
  );
}

type CallRow = Awaited<ReturnType<typeof listCallsAdmin>>[number];

function CallList({ heading, calls, emptyText }: { heading: string; calls: CallRow[]; emptyText: string }) {
  const id = `calls-${heading.toLowerCase()}`;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id}>{heading}</h2>
      {calls.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>{heading} group calls</caption>
            <thead>
              <tr>
                <th scope="col">Call</th>
                <th scope="col">Starts</th>
                <th scope="col">Length</th>
                <th scope="col">Audience</th>
                <th scope="col">Join link</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const audience = (c.communities as unknown as { name: string } | null)?.name ?? "Every student";
                return (
                  <tr key={c.id}>
                    <td className={styles.wrapText}>
                      {c.title}
                      {c.description && <span className={styles.subline}>{c.description}</span>}
                    </td>
                    <td>
                      <LocalTime iso={c.starts_at} />
                    </td>
                    <td className={styles.num}>{c.duration_minutes} min</td>
                    <td>
                      <StatusBadge tone="neutral">{audience}</StatusBadge>
                    </td>
                    <td>
                      {c.join_url ? (
                        <a href={c.join_url} target="_blank" rel="noopener noreferrer">
                          Open link
                        </a>
                      ) : (
                        <span className="hint">None yet</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
