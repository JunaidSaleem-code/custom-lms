import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/features/auth/session";
import { listRecentAndUpcomingCalls } from "@/features/calls/queries";
import { callWindow, JOIN_EARLY_MINUTES } from "@/features/calls/status";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Group calls" };

export default async function CallsPage() {
  const { supabase } = await requireUser();
  const calls = await listRecentAndUpcomingCalls(supabase);

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title="Group calls"
        description={`Coaching calls scheduled for you. The join link appears ${JOIN_EARLY_MINUTES} minutes before each call.`}
      />

      {calls.length === 0 ? (
        <EmptyState title="No calls scheduled">
          <p>When a group call is scheduled, it will show up here.</p>
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {calls.map((c) => {
            const w = callWindow(c);
            return (
              <li key={c.id} className={`card ${styles.item}`}>
                <div className={styles.head}>
                  <h2>{c.title}</h2>
                  {w.state === "live" && <StatusBadge tone="success">Live now</StatusBadge>}
                  {w.state === "ended" && <StatusBadge>Ended</StatusBadge>}
                  {w.state === "upcoming" && <StatusBadge tone="brand">Upcoming</StatusBadge>}
                </div>
                <p className={styles.when}>
                  <LocalTime iso={c.starts_at} kind="datetime" /> · {c.duration_minutes} min
                </p>
                {c.description && <p>{c.description}</p>}
                {w.joinable && c.join_url ? (
                  <a href={c.join_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Join call
                  </a>
                ) : w.state !== "ended" && !c.join_url ? (
                  <p className="hint">The join link will be shared before the call.</p>
                ) : w.state === "upcoming" ? (
                  <p className="hint">The join link appears {JOIN_EARLY_MINUTES} minutes before the start.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
