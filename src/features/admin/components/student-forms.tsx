"use client";

import { useActionState } from "react";
import {
  extendEnrollmentAction,
  grantPlanAction,
  inviteStudentAction,
  removeStudentAction,
  revokeEnrollmentAction,
  sendPasswordResetAction,
} from "../actions/students";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import styles from "@/app/admin/admin.module.css";

type PlanOption = { id: string; name: string; isActive: boolean };

export function InviteStudentForm({ plans }: { plans: PlanOption[] }) {
  const [state, action] = useActionState(inviteStudentAction, undefined);
  const activePlans = plans.filter((p) => p.isActive);

  return (
    <form action={action} className="form">
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor="invite-name" className="label">
            Full name
          </label>
          <input id="invite-name" name="fullName" className="input" required maxLength={80} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="invite-email" className="label">
            Email
          </label>
          <input id="invite-email" name="email" type="email" className="input" required maxLength={254} autoComplete="off" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="invite-plan" className="label">
          Plan <span className="hint">(optional, gives access straight away)</span>
        </label>
        <select id="invite-plan" name="planId" className="input" defaultValue="">
          <option value="">No plan yet</option>
          {activePlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Sending invitation…">Send invitation</SubmitButton>
      </div>
    </form>
  );
}

export function GrantPlanForm({ userId, plans }: { userId: string; plans: PlanOption[] }) {
  const [state, action] = useActionState(grantPlanAction, undefined);
  const activePlans = plans.filter((p) => p.isActive);

  return (
    <form action={action} className={styles.actions}>
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor="grant-plan" className={styles.srOnly}>
        Plan to add
      </label>
      <select id="grant-plan" name="planId" required defaultValue="" className={`input ${styles.narrow}`}>
        <option value="" disabled>
          Choose a plan
        </option>
        {activePlans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <SubmitButton pendingLabel="Adding…" className="btn btn-primary">
        Add membership
      </SubmitButton>
      <div className={styles.full}>
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    </form>
  );
}

export function ExtendEnrollmentForm({ enrollmentId, userId }: { enrollmentId: string; userId: string }) {
  const [state, action] = useActionState(extendEnrollmentAction, undefined);
  return (
    <form action={action} className={styles.actions}>
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor={`extend-${enrollmentId}`} className={styles.srOnly}>
        Days to add
      </label>
      <input
        id={`extend-${enrollmentId}`}
        name="days"
        type="number"
        min={1}
        max={730}
        defaultValue={30}
        required
        className={`input ${styles.narrowest}`}
      />
      <SubmitButton pendingLabel="Extending…" className="btn btn-ghost">
        Extend (days)
      </SubmitButton>
      <div className={styles.full}>
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    </form>
  );
}

export function RevokeEnrollmentForm({ enrollmentId, userId }: { enrollmentId: string; userId: string }) {
  const [state, action] = useActionState(revokeEnrollmentAction, undefined);
  return (
    <form
      action={action}
      className={styles.actions}
      onSubmit={(e) => {
        if (!window.confirm("End this membership now? The student loses access to its courses straight away.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton pendingLabel="Ending…" className={`btn btn-ghost ${styles.dangerButton}`}>
        End membership
      </SubmitButton>
      <div className={styles.full}>
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(sendPasswordResetAction, undefined);
  return (
    <form action={action} className={styles.actions}>
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton pendingLabel="Sending…" className="btn btn-ghost">
        Send password reset email
      </SubmitButton>
      <div className={styles.full}>
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    </form>
  );
}

export function RemoveStudentForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(removeStudentAction, undefined);
  return (
    <form
      action={action}
      className={styles.actions}
      onSubmit={(e) => {
        if (!window.confirm("Permanently remove this student? Their account and profile are deleted. Lesson records are deleted with them.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton pendingLabel="Removing…" className={`btn btn-ghost ${styles.dangerButton}`}>
        Remove student
      </SubmitButton>
      <div className={styles.full}>
        <FormMessage error={state?.error} />
      </div>
    </form>
  );
}
