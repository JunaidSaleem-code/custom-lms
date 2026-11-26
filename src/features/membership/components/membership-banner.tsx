import type { MembershipState } from "../status";
import { LocalTime } from "@/components/ui/local-time";
import styles from "./membership-banner.module.css";

type Tone = "info" | "warning" | "danger";

// Shown at the top of the dashboard whenever access is not simply "active with no end date".
export function MembershipBanner({ state }: { state: MembershipState }) {
  const view = describe(state);
  if (!view) return null;

  return (
    <section className={`${styles.banner} ${styles[view.tone]}`} aria-label="Membership status">
      <div className={styles.text}>
        <strong className={styles.title}>{view.title}</strong>
        <p>{view.body}</p>
        {/* Placeholder (docs/PLACEHOLDERS.md #3 and #15): self-serve renewal waits on the payment decision. */}
        {view.tone !== "info" && (
          <button type="button" className="btn btn-ghost" disabled title="Renewal is coming soon">
            Renew (coming soon)
          </button>
        )}
      </div>
    </section>
  );
}

function describe(state: MembershipState): { tone: Tone; title: string; body: React.ReactNode } | null {
  switch (state.kind) {
    case "active":
      return null; // Nothing to flag: the student has full access.
    case "expiring":
      return {
        tone: "warning",
        title: `${state.planName}: access ends soon`,
        body: (
          <>
            Your access ends on <LocalTime iso={state.expiresAt} kind="date" /> (
            {state.daysLeft <= 0 ? "today" : `${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"} left`}).
            Contact the Sales Coaching team to renew.
          </>
        ),
      };
    case "upcoming":
      return {
        tone: "info",
        title: `${state.planName}: starts soon`,
        body: (
          <>
            Your access starts on <LocalTime iso={state.startsAt} kind="date" />.
          </>
        ),
      };
    case "expired":
      return {
        tone: "danger",
        title: `${state.planName}: access has ended`,
        body: (
          <>
            Your access ended on <LocalTime iso={state.expiredAt} kind="date" />. Your progress is saved.
            Contact the Sales Coaching team to renew.
          </>
        ),
      };
    case "ended":
      return {
        tone: "danger",
        title: `${state.planName}: membership inactive`,
        body: "Your membership is no longer active. Contact the Sales Coaching team if you think this is a mistake.",
      };
    case "none":
      return {
        tone: "info",
        title: "No active membership yet",
        body: "If you've just purchased, your access can take a few minutes to activate. If it still doesn't show after that, contact the Sales Coaching team.",
      };
  }
}
