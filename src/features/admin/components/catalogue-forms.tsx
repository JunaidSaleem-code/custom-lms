"use client";

import { useActionState, useId } from "react";
import {
  addQuestionAction,
  saveCommunityAction,
  saveCourseAction,
  saveLessonAction,
  saveModuleAction,
  savePlanAction,
} from "../actions/catalogue";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import styles from "@/app/admin/admin.module.css";

type Option = { id: string; name: string };

// ---------------------------------------------------------------- plans

type PlanValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  access_duration_days: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
};

export function PlanForm({
  plan,
  courses,
  communities,
  courseIds,
  communityIds,
}: {
  plan?: PlanValues;
  courses: { id: string; title: string }[];
  communities: Option[];
  courseIds: string[];
  communityIds: string[];
}) {
  const [state, action] = useActionState(savePlanAction, undefined);
  const uid = useId();
  const selectedCourses = new Set(courseIds);
  const selectedCommunities = new Set(communityIds);

  return (
    <form action={action} className="form">
      <input type="hidden" name="planId" value={plan?.id ?? ""} />

      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-name`} className="label">
            Plan name
          </label>
          <input id={`${uid}-name`} name="name" className="input" required maxLength={80} defaultValue={plan?.name ?? ""} placeholder="e.g. Full Course" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-slug`} className="label">
            URL name <span className="hint">(optional, made from the plan name)</span>
          </label>
          <input id={`${uid}-slug`} name="slug" className="input" maxLength={80} defaultValue={plan?.slug ?? ""} />
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${uid}-description`} className="label">
          Description <span className="hint">(optional)</span>
        </label>
        <textarea id={`${uid}-description`} name="description" className="input" maxLength={1000} defaultValue={plan?.description ?? ""} />
      </div>

      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-days`} className="label">
            Access duration (days) <span className="hint">(blank = no expiry)</span>
          </label>
          <input
            id={`${uid}-days`}
            name="accessDays"
            type="number"
            min={1}
            max={3650}
            step={1}
            className="input"
            defaultValue={plan?.access_duration_days ?? ""}
            placeholder="e.g. 90"
          />
          <span className="hint">Access runs from the date of purchase or grant, then ends automatically.</span>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-stripe`} className="label">
            Stripe price id <span className="hint">(optional, for purchase sync)</span>
          </label>
          <input id={`${uid}-stripe`} name="stripePriceId" className="input" maxLength={100} defaultValue={plan?.stripe_price_id ?? ""} />
        </div>
      </div>

      <label className={styles.check}>
        <input type="checkbox" name="isActive" defaultChecked={plan?.is_active ?? true} />
        Active (new memberships can be sold or granted)
      </label>

      <div className={styles.fieldRow}>
        <fieldset className={styles.checkGroup}>
          <legend className={styles.checkGroupTitle}>Courses included</legend>
          {courses.length === 0 && <p className={styles.emptyNote}>No courses yet. Create one on the Courses page.</p>}
          {courses.map((c) => (
            <label key={c.id} className={styles.check}>
              <input type="checkbox" name="courseIds" value={c.id} defaultChecked={selectedCourses.has(c.id)} />
              {c.title}
            </label>
          ))}
        </fieldset>

        <fieldset className={styles.checkGroup}>
          <legend className={styles.checkGroupTitle}>Communities this plan can join</legend>
          {communities.length === 0 && <p className={styles.emptyNote}>No communities yet. Create one on the Communities page.</p>}
          {communities.map((c) => (
            <label key={c.id} className={styles.check}>
              <input type="checkbox" name="communityIds" value={c.id} defaultChecked={selectedCommunities.has(c.id)} />
              {c.name}
            </label>
          ))}
        </fieldset>
      </div>

      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Saving…">{plan ? "Save plan" : "Create plan"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- courses

type CourseValues = { id: string; title: string; slug: string; description: string | null; status: "draft" | "published"; sort_order: number };

export function CourseForm({ course }: { course?: CourseValues }) {
  const [state, action] = useActionState(saveCourseAction, undefined);
  const uid = useId();

  return (
    <form action={action} className="form">
      <input type="hidden" name="courseId" value={course?.id ?? ""} />
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-title`} className="label">
            Course title
          </label>
          <input id={`${uid}-title`} name="title" className="input" required maxLength={120} defaultValue={course?.title ?? ""} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-slug`} className="label">
            URL name <span className="hint">(optional)</span>
          </label>
          <input id={`${uid}-slug`} name="slug" className="input" maxLength={80} defaultValue={course?.slug ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-description`} className="label">
          Description <span className="hint">(shown to students)</span>
        </label>
        <textarea id={`${uid}-description`} name="description" className="input" maxLength={2000} defaultValue={course?.description ?? ""} />
      </div>
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-status`} className="label">
            Visibility
          </label>
          <select id={`${uid}-status`} name="status" className="input" defaultValue={course?.status ?? "draft"}>
            <option value="draft">Draft (hidden from students)</option>
            <option value="published">Published (visible to students with the plan)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-sort`} className="label">
            Position <span className="hint">(lower shows first)</span>
          </label>
          <input id={`${uid}-sort`} name="sortOrder" type="number" min={0} className="input" defaultValue={course?.sort_order ?? ""} placeholder="Last" />
        </div>
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Saving…">{course ? "Save course" : "Create course"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- modules

type ModuleValues = { id: string; title: string; description: string | null; status: "draft" | "published"; sort_order: number };

export function ModuleForm({ courseId, module: mod }: { courseId: string; module?: ModuleValues }) {
  const [state, action] = useActionState(saveModuleAction, undefined);
  const uid = useId();

  return (
    <form action={action} className="form">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={mod?.id ?? ""} />
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-title`} className="label">
            Module title
          </label>
          <input id={`${uid}-title`} name="title" className="input" required maxLength={120} defaultValue={mod?.title ?? ""} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-status`} className="label">
            Visibility
          </label>
          <select id={`${uid}-status`} name="status" className="input" defaultValue={mod?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-sort`} className="label">
            Position
          </label>
          <input id={`${uid}-sort`} name="sortOrder" type="number" min={0} className="input" defaultValue={mod?.sort_order ?? ""} placeholder="Last" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-description`} className="label">
          Description <span className="hint">(optional)</span>
        </label>
        <textarea id={`${uid}-description`} name="description" className="input" maxLength={2000} defaultValue={mod?.description ?? ""} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Saving…">{mod ? "Save module" : "Add module"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- lessons

type LessonValues = {
  id: string;
  title: string;
  description: string | null;
  stream_uid: string | null;
  duration_seconds: number | null;
  completion_threshold: number;
  status: "draft" | "published";
  sort_order: number;
};

export function LessonForm({ courseId, moduleId, lesson }: { courseId: string; moduleId: string; lesson?: LessonValues }) {
  const [state, action] = useActionState(saveLessonAction, undefined);
  const uid = useId();

  return (
    <form action={action} className="form">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <input type="hidden" name="lessonId" value={lesson?.id ?? ""} />
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-title`} className="label">
            Lesson title
          </label>
          <input id={`${uid}-title`} name="title" className="input" required maxLength={160} defaultValue={lesson?.title ?? ""} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-stream`} className="label">
            Video id <span className="hint">(Cloudflare Stream)</span>
          </label>
          <input id={`${uid}-stream`} name="streamUid" className="input" maxLength={64} defaultValue={lesson?.stream_uid ?? ""} placeholder="Paste from Stream" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-status`} className="label">
            Visibility
          </label>
          <select id={`${uid}-status`} name="status" className="input" defaultValue={lesson?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published (needs a video id)</option>
          </select>
        </div>
      </div>
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-duration`} className="label">
            Length (seconds) <span className="hint">(used for progress)</span>
          </label>
          <input id={`${uid}-duration`} name="durationSeconds" type="number" min={1} step="any" className="input" defaultValue={lesson?.duration_seconds ?? ""} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-threshold`} className="label">
            Completed at (%)
          </label>
          <input
            id={`${uid}-threshold`}
            name="completionPercent"
            type="number"
            min={1}
            max={100}
            className="input"
            defaultValue={Math.round((lesson?.completion_threshold ?? 0.9) * 100)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-sort`} className="label">
            Position
          </label>
          <input id={`${uid}-sort`} name="sortOrder" type="number" min={0} className="input" defaultValue={lesson?.sort_order ?? ""} placeholder="Last" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-description`} className="label">
          Description <span className="hint">(optional)</span>
        </label>
        <textarea id={`${uid}-description`} name="description" className="input" maxLength={3000} defaultValue={lesson?.description ?? ""} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Saving…">{lesson ? "Save lesson" : "Add lesson"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- quiz questions

export function QuestionForm({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const [state, action] = useActionState(addQuestionAction, undefined);
  const uid = useId();

  return (
    <form action={action} className="form">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="field">
        <label htmlFor={`${uid}-question`} className="label">
          Question
        </label>
        <textarea id={`${uid}-question`} name="questionText" className="input" required minLength={5} maxLength={500} />
      </div>
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-show`} className="label">
            Show at (seconds into the video)
          </label>
          <input id={`${uid}-show`} name="showAtSeconds" type="number" min={0} step="any" className="input" placeholder="e.g. 120" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-points`} className="label">
            Points
          </label>
          <input id={`${uid}-points`} name="points" type="number" min={0} max={100} defaultValue={1} className="input" />
        </div>
      </div>
      <fieldset className={styles.checkGroup}>
        <legend className={styles.checkGroupTitle}>Answer options (mark the correct one)</legend>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.optionRow}>
            <input type="radio" name="correctIndex" value={i} defaultChecked={i === 0} aria-label={`Option ${i + 1} is the correct answer`} />
            <input
              name={`option${i}`}
              className="input"
              maxLength={300}
              aria-label={`Answer option ${i + 1}`}
              placeholder={`Option ${i + 1}${i < 2 ? "" : " (optional)"}`}
              required={i < 2}
            />
          </div>
        ))}
        <p className={styles.emptyNote}>Leave the last options blank if you need fewer than four. Students never see which one is correct until they answer.</p>
      </fieldset>
      <div className="field">
        <label htmlFor={`${uid}-explain`} className="label">
          Explanation <span className="hint">(shown after answering, optional)</span>
        </label>
        <textarea id={`${uid}-explain`} name="explanation" className="input" maxLength={500} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Adding…">Add question</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- communities

type CommunityValues = { id: string; name: string; slug: string; description: string | null; is_active: boolean };

export function CommunityForm({ community }: { community?: CommunityValues }) {
  const [state, action] = useActionState(saveCommunityAction, undefined);
  const uid = useId();

  return (
    <form action={action} className="form">
      <input type="hidden" name="communityId" value={community?.id ?? ""} />
      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor={`${uid}-name`} className="label">
            Community name
          </label>
          <input id={`${uid}-name`} name="name" className="input" required maxLength={80} defaultValue={community?.name ?? ""} placeholder="e.g. Full Course Community" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-slug`} className="label">
            URL name <span className="hint">(optional)</span>
          </label>
          <input id={`${uid}-slug`} name="slug" className="input" maxLength={80} defaultValue={community?.slug ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-description`} className="label">
          Description <span className="hint">(optional)</span>
        </label>
        <textarea id={`${uid}-description`} name="description" className="input" maxLength={1000} defaultValue={community?.description ?? ""} />
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="isActive" defaultChecked={community?.is_active ?? true} />
        Active (students with a linked plan can see it)
      </label>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Saving…">{community ? "Save community" : "Create community"}</SubmitButton>
      </div>
    </form>
  );
}
