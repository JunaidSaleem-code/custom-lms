"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  createThreadAction,
  saveAnnouncementAction,
  saveCallAction,
  sendAdminMessageAction,
  setAnnouncementPublishedAction,
} from "../actions/communications";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import styles from "@/app/admin/admin.module.css";

type Option = { id: string; name: string };

// Date and time picker that submits an ISO timestamp. The browser knows the admin's time zone, so the
// call starts at the time they picked, not at the server's time zone.
function DateTimeInput({ name, id, label }: { name: string; id: string; label: string }) {
  const [local, setLocal] = useState("");
  const parsed = local ? new Date(local) : null;
  const iso = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : "";

  return (
    <>
      <input id={id} type="datetime-local" className="input" required value={local} onChange={(e) => setLocal(e.target.value)} aria-label={label} />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

export function AnnouncementForm({ communities }: { communities: Option[] }) {
  const [state, action] = useActionState(saveAnnouncementAction, undefined);
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <div className="field">
        <label htmlFor={`${uid}-title`} className="label">
          Title
        </label>
        <input id={`${uid}-title`} name="title" className="input" required maxLength={160} placeholder="e.g. New module released" />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-body`} className="label">
          Message
        </label>
        <textarea id={`${uid}-body`} name="body" className="input" required maxLength={5000} />
      </div>
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-audience`} className="label">
            Audience
          </label>
          <select id={`${uid}-audience`} name="communityId" className="input" defaultValue="">
            <option value="">Every student</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="publishNow" defaultChecked />
        Publish now (uncheck to save as a draft)
      </label>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Saving…">Save announcement</SubmitButton>
      </div>
    </form>
  );
}

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [state, action] = useActionState(setAnnouncementPublishedAction, undefined);
  return (
    <form action={action} className={styles.actions}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="publish" value={published ? "no" : "yes"} />
      <SubmitButton pendingLabel="Saving…" className="btn btn-ghost">
        {published ? "Move to drafts" : "Publish"}
      </SubmitButton>
      <div className={styles.full}>
        <FormMessage error={state?.error} success={state?.success} />
      </div>
    </form>
  );
}

export function CallForm({ communities }: { communities: Option[] }) {
  const [state, action] = useActionState(saveCallAction, undefined);
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <div className="field">
        <label htmlFor={`${uid}-title`} className="label">
          Call title
        </label>
        <input id={`${uid}-title`} name="title" className="input" required maxLength={160} placeholder="e.g. Monthly coaching call" />
      </div>
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-start`} className="label">
            Starts
          </label>
          <DateTimeInput id={`${uid}-start`} name="startsAt" label="Start date and time" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-duration`} className="label">
            Length (minutes)
          </label>
          <input id={`${uid}-duration`} name="durationMinutes" type="number" min={5} max={600} defaultValue={60} className="input" required />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-audience`} className="label">
            Audience
          </label>
          <select id={`${uid}-audience`} name="communityId" className="input" defaultValue="">
            <option value="">Every student</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-join`} className="label">
          Join link <span className="hint">(https, from your call provider)</span>
        </label>
        <input id={`${uid}-join`} name="joinUrl" type="url" className="input" placeholder="https://…" maxLength={500} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-description`} className="label">
          Notes <span className="hint">(optional)</span>
        </label>
        <textarea id={`${uid}-description`} name="description" className="input" maxLength={2000} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Scheduling…">Schedule call</SubmitButton>
      </div>
    </form>
  );
}

export function ThreadForm({ students }: { students: Option[] }) {
  const [state, action] = useActionState(createThreadAction, undefined);
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <div className="field">
        <label htmlFor={`${uid}-student`} className="label">
          Student
        </label>
        <select id={`${uid}-student`} name="studentId" className="input" required defaultValue="">
          <option value="" disabled>
            Choose a student
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-body`} className="label">
          First message
        </label>
        <textarea id={`${uid}-body`} name="body" className="input" required maxLength={2000} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Starting…">Start conversation</SubmitButton>
      </div>
    </form>
  );
}

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(sendAdminMessageAction, undefined);
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="field">
        <label htmlFor={`${uid}-body`} className="label">
          Reply
        </label>
        <textarea id={`${uid}-body`} name="body" className="input" required maxLength={2000} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Sending…">Send reply</SubmitButton>
      </div>
    </form>
  );
}
