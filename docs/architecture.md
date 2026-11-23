# Architecture: Nick Sales Coaching Portal (v1)

Status: **Draft for approval.** No application code has been written yet.
Schema check: `supabase/migrations/0001_student_schema.sql` applies cleanly on PostgreSQL 17 with a Supabase-compatible stub (auth schema, roles), and 35 access-rule and constraint checks pass. It has **not yet** been applied to a hosted Supabase project; that happens once the client's Supabase project exists. The pg_cron expiry job is commented out and untested.
Scope of this document: overall architecture and the **student dashboard** data model.
Admin dashboard, AI features, gamification rules, and communities are covered later, but the schema already leaves room for them.

Principles: **KISS** (boring, proven tools, minimal moving parts) and **DRY** (one source of truth per fact; access rules live in the database, not repeated in the app).

---

## 1. Decisions

Each decision is marked **[Client]** (you chose it) or **[My call]** (my recommendation; you can override it).

| Area | Decision | Source |
|---|---|---|
| Build approach | Build the portal from scratch (not a third-party LMS) | [Client] |
| Web framework | Next.js (TypeScript, App Router): one codebase for student and admin areas | [My call] |
| Backend and database | Supabase (PostgreSQL, Auth, Storage) in a project **owned by the client** | [Client] |
| Video hosting | Cloudflare Stream, signed playback URLs, player events for progress | [Client] |
| Student login | Email and password. Admin invites by email; student sets password via the invite link; password reset by email | [Client] (simplest option that meets the requirements) |
| Plan purchases | Stripe Checkout for payment; Stripe webhooks create enrollments in the portal. Portal does not handle card data | [My call], pending your confirmation (see Open Questions) |
| Transactional email | Supabase Auth emails for login/invite/reset; a transactional provider (e.g. Resend) for onboarding emails | [My call] |
| Hosting of the web app | Vercel, in an account owned by the client | [My call] |
| File storage | Supabase Storage for course resources and certificate PDFs | [My call] |
| AI provider (later phase) | Claude API for question generation and roleplay reports; voice layer chosen in the AI phase | [My call], pending the technical evaluation the brief requires |

The requirements document does not name a stack. The stack above is my proposal, and it was approved only as "Next.js + Supabase" in your answer.

---

## 2. System overview

```
                 Students (browser / installed PWA)     Admin (Nick, browser)
                              |                                  |
                              v                                  v
                 +-------------------------------------------------------+
                 |        Next.js app (Vercel, client-owned account)     |
                 |  /learn  student dashboard   /admin  admin dashboard  |
                 |  Server code (route handlers / server actions)        |
                 +-------------------------------------------------------+
                    |               |                  |              |
          Supabase client      Supabase service    Stripe webhook   Stream API
          (user session,       role (server only,  (verified by     (signed playback
           RLS enforced)        admin tasks)        signature)       tokens)
                    |               |                  |              |
                    v               v                  v              v
      +-----------------------------------------+   +--------+   +-------------+
      | Supabase project (client-owned)          |   | Stripe |   | Cloudflare  |
      |  Auth      : accounts, sessions, emails  |   +--------+   | Stream      |
      |  Postgres  : schema 0001, RLS, RPCs,     |                | (video)     |
      |              pg_cron expiry job          |                +-------------+
      |  Storage   : resources, certificates     |
      +-----------------------------------------+
                                                    Email provider (onboarding)
```

### Components

| Component | Responsibility |
|---|---|
| Next.js app | UI for both dashboards; server code that talks to Supabase, Stripe, and Stream |
| Supabase Postgres | Source of truth for all data. Access rules are enforced here (RLS) |
| Supabase Auth | Account creation, invites, login, password reset |
| Supabase Storage | Resource files and generated certificate PDFs (private buckets, signed links) |
| Cloudflare Stream | Video storage and playback. Videos are private; playback needs a short-lived signed token |
| Stripe | Takes payment. Sends webhooks that create or update enrollments |
| pg_cron (in Postgres) | Hourly job that marks expired enrollments. Access checks also compare dates directly, so a late job cannot grant extra access |
| Background job queue | Runs AI transcription, question generation, and report generation outside request handlers. Provider chosen in Phase 4 (e.g. Supabase queues, pg-boss, or Inngest) [My call] |

---

## 3. Key flows

**Enrollment (purchase to access)**
1. Student pays through Stripe Checkout.
2. Stripe sends `checkout.session.completed` (and renewal events if the plan is a subscription).
3. The webhook handler verifies the Stripe signature, then upserts an `enrollments` row keyed by `(source, source_ref)`. Replayed webhooks do nothing.
4. The handler creates the student's auth account with an invite if none exists, and sends the onboarding email.
5. Access follows from data: `plan_courses` gives the courses, `enrollments` gives the dates. No code path grants access directly.

**Access check**
- Lessons, modules, and courses are visible only through RLS policies that call `can_access_course()` and `can_access_lesson()`. The app cannot widen access by mistake.
- Access = enrollment is `active`, `starts_at <= now()`, and (`expires_at` is null or `expires_at > now()`).

**Expiry**
- An hourly `pg_cron` job sets `status = 'expired'` where `expires_at <= now()`. Access checks compare dates directly, so correctness does not depend on the job running on time.

**Video playback and tracking**
1. Student opens a lesson. Server checks `can_access_lesson()` and issues a short-lived Stream signed token.
2. The player sends events (`play`, `pause`, `seek`, `heartbeat`, `ended`) to the server.
3. Server calls the `record_lesson_event()` function, which writes the raw event log and updates `lesson_progress` in one transaction. It records first interaction, last position, furthest position, watched time, and completion.
4. Watched time per heartbeat is capped server-side so it cannot be inflated.

**Quiz answers**
- The student submits an option id to `submit_question_answer()`. The function checks access, computes correctness on the server, records the attempt once, and writes points to the ledger. Correct answers are never sent to the browser.

**Communities**
- Membership is derived, not stored. A student belongs to a community when an active enrollment's plan is linked to that community (`community_plans`). Changing a plan's communities changes everyone's access at once.

---

## 4. Security

- **Row-Level Security on every table.** Students see only their own rows, plus published content they are entitled to.
- **Column-level restrictions.** Students cannot change their own `role`. Quiz correct answers (`question_options.is_correct`) are not readable by students.
- **Writes that matter go through functions** (`record_lesson_event`, `submit_question_answer`) so the rules are enforced in one place.
- **Service role key** is used only in server code, never in the browser. Admin pages verify `is_admin()` on the server before using it.
- **Secrets** (Stripe, Stream, email, Supabase service key) live in the hosting provider's environment settings, never in the repository.
- **Ownership.** All accounts (Supabase, Vercel, Stripe, Cloudflare, email provider) are registered to the client, with the development team given the required roles. This matches section 10 of the brief.
- **Backups.** Supabase point-in-time recovery requires a paid plan. Needed for the retention requirement still to be decided.

---

## 5. Code layout (proposed)

```
custom-lms/
  docs/architecture.md
  supabase/
    migrations/0001_student_schema.sql     <- student dashboard schema (this phase)
  src/
    app/
      (student)/learn/...                  <- student dashboard
      (admin)/admin/...                    <- later phase
      api/stripe/webhook/route.ts          <- enrollment sync
    lib/
      supabase/                            <- browser and server clients
      stream/                              <- signed playback tokens
      stripe/
    components/
  .env.example                             <- variable names only, no values
```

---

## 6. Phasing

| Phase | Contents | Status |
|---|---|---|
| 0 | Accounts, repo, hosting, Supabase project, CI basics, job queue, logging, and analytics event naming (event names defined before features emit them) | Waiting on accounts (client) |
| 0b | **Voice prototype spike** (throwaway): microphone access, speech in/out, latency, provider feasibility, cost estimate. Runs in parallel with Phase 1 | Needs voice-provider choice |
| 1 | **Student dashboard**: login, courses by plan, modules, video with tracking, progress, quizzes with points, certificates, communities, messages, announcements, group calls (view only) | Schema drafted (this document) |
| 2 | Admin dashboard: students, invitations, plans, course builder, analytics | Not started |
| 3 | Stripe sync, onboarding emails, expiry job | Not started |
| 4 | AI video question generation and admin review | Not started |
| 5 | AI voice roleplay and performance reports (required for initial release per the brief) | Not started; provider evaluation needed |
| 6 | Gamification rules, leaderboards, weekly challenges | Waiting on client decisions |
| 7 | PWA packaging, push notifications, website integration, UAT, handover | Not started |

Phase 3 is grouped separately because Stripe sync is the main dependency for real students. Phase 5 is still required for the first release, as committed in the brief. It can ship last only if the client confirms the first release date allows it.

---

## 7. Open questions (need your answers before Phase 1 is built)

1. **Plan purchases:** Stripe Checkout (my recommendation) is the simplest secure option. Confirm it, or tell me who currently sells the plans.
2. **Sales website:** Is the public website built separately, by another team? If yes, they only need to link to the portal's checkout. Do we need to build the sales site too?
3. **Plan durations:** How long does each plan last (Basic, Full, Course + Mentorship)? Is each plan one-time payment for a fixed duration, or a recurring subscription? The schema supports both, but the webhook logic differs.
4. **Course completion rule:** Is a course "complete" when every lesson is completed? My default: a lesson is complete at 90% of its length. Confirm both.
5. **Certificates:** Which courses issue one, and what is the exact eligibility rule?
6. **Messaging:** Can students message each other, or only Nick and admins? My default: students message only Nick/admins, one thread per student.
7. **Gamification:** Points per action and leaderboard scope are still open. The schema records points generically, so these can be decided later without schema changes.
8. **Data retention:** How long should raw video-watch events (`lesson_events`) be kept? My default: 2 years, then deleted. This is needed for refund disputes, so please confirm.
9. **Group calls:** Which provider (Zoom, Google Meet, etc.)? The schema stores only a join link for now.
10. **Hosting region:** Any data-residency requirement? Supabase region and Cloudflare Stream region depend on it.
