# Placeholders and open items

Single source of truth for everything that is not finished yet. Update this file in the same change that finishes or adds an item. Last updated: 2026-11-26.

Status key: **Open** = not started. **Blocked** = waiting on a client decision or account. **Sample** = works, but uses seeded sample data.

## Blocked on client decisions

| # | Item | Where it shows | Needs |
|---|---|---|---|
| 1 | Lesson video playback | Lesson page, player placeholder text | Cloudflare Stream signing key, and each lesson's `stream_uid` |
| 2 | Certificate eligibility rule | Certificates page empty-state text | Which courses issue certificates, and what counts as complete |
| 3 | Membership renewal | Membership banner ("contact the team"). Disabled "Renew (coming soon)" button on expiring and expired banners. | Renewal link or process, and plan durations |
| 4 | Gamification rules | Points page labels, dashboard "Points earned" | Points per action, leaderboard scope |
| 5 | Data retention for watch events | Database (`lesson_events`) | How long to keep raw watch events |
| 6 | Group call provider | Calls page join-link text | Provider (Zoom, Google Meet, etc.) |
| 7 | Payment provider and purchase flow | Enrollment creation (manual today) | Stripe or website decision, plan durations |

## Built, but using sample data or manual steps

| # | Item | Where | Notes |
|---|---|---|---|
| 8 | Test student, courses, lessons, quiz, community, announcement, call, thread | Dev database | Created by `scripts/dev-seed.mjs`. All labelled "(sample)". |
| 9 | Certificate `SAMPLE-0001` | Certificates page | Sample row only. No PDF. |
| 10 | Enrollment | Dev database | Created by seed script. Production needs the purchase sync. |
| 11 | Lesson materials | Lesson page "Materials" list | Shows titles only. Needs Storage bucket and signed download links. |
| 12 | Group call join links | Calls page | Stored by hand in `group_calls.join_url`. |
| 13 | Quick-check answers | Lesson page | Explanation shown, correct option not revealed (intentional). |
| 13a | Student / Admin role switch | Top bar on `/learn` and `/admin` | DEMO MODE, visible on every build including the live demo. Each click changes the account's `profiles.role` (`features/admin/actions/role.ts`), so any signed-in student can become admin and see all student data. Before real students use the site: restore the `NODE_ENV === "production"` guard in both files, or replace with an admin-only view switch. Production admin is granted with `scripts/set-admin.mjs`. |
| 14 | Admin dashboard | `/admin` (admins only; switch with the Student / Admin toggle at the top of the page) | Overview analytics, students (invite, plans, memberships, extend or end access, password reset, remove, activity and video progress), plans, course builder (modules, lessons, quick checks), communities, announcements, group calls, messages. Video ids are pasted by hand from Cloudflare Stream (no upload from the portal yet). Courses, modules and lessons can be hidden with Draft but not deleted, so student progress is kept. Admin is one role flag (`set-admin.mjs`); finer roles come later. |

## Not built yet

| # | Item | Planned phase | Notes |
|---|---|---|---|
| 15 | Stripe checkout and webhook enrollment sync | Phase 3 | Enrollments are manual until then. Renew button in the membership banner is a placeholder (item 3). |
| 16 | Onboarding and expiry emails | Phase 3 | Currently only Supabase auth emails. Backend only, no UI placeholder. |
| 17 | Expiry job (`pg_cron`) | Phase 3 | SQL is commented out in migration 0001. Access is still date-checked. Backend only. |
| 18 | AI question generation and admin review | Phase 4 | Schema ready (`source = 'ai'`, `is_approved`). Admin course page shows a disabled "Generate questions (coming soon)" placeholder. |
| 19 | AI voice roleplay and reports | Phase 5 | Required for first release. Provider decision needed. Courses page shows a disabled "Start a roleplay (coming soon)" placeholder. |
| 20 | Leaderboards and weekly challenges | Phase 6 | Depends on item 4. Student dashboard shows a "Leaderboard coming soon" placeholder. |
| 21 | Avatar upload | Phase 2 | `profiles.avatar_path` exists. Account page shows a disabled "Upload photo (coming soon)" placeholder. |
| 22 | Push notifications and installable app (PWA) | Phase 7 | Manifest, icons, service worker not added. Account page shows a disabled "Install app (coming soon)" placeholder. |
| 23 | Message thread creation by students | Undecided | Admin creates threads today. Messages page shows a disabled "New conversation (coming soon)" placeholder. |
| 24 | Community moderation (reporting, pinning) | Phase 6 | Authors can delete own posts only. Other members' posts show a disabled "Report (coming soon)" placeholder. |
| 25 | Analytics events | Phase 2 | Event names to be defined before admin analytics. Admin overview shows a "Detailed analytics coming soon" placeholder. |
| 26 | Custom SMTP for emails | Before launch | Supabase's built-in email is rate-limited. Backend only. |
| 27 | Multi-factor sign-in for admins | Before launch | Planned with admin dashboard. Account page shows a disabled "Two-step sign-in (coming soon)" placeholder. |

## Verified

- Typecheck, lint, 77 unit tests, production build (admin routes included), re-run 2026-11-26 after the instant opt-out change.
- Production server (2026-11-26): public pages return 200; every signed-in page and admin page redirects logged-out visitors to `/login`; a student account does not see the Student/Admin switch in the page HTML.
- Dev console: the Next.js "uncached data outside Suspense" errors are gone on the course, admin course and dashboard pages after adding `export const instant = false` to the 26 per-user pages.
- Browser (Playwright, dev server, 2026-11-26): student dashboard, courses (roleplay placeholder), progress (points crash fixed), messages (new-conversation placeholder), account (photo, two-step and install placeholders); admin overview (analytics placeholder), courses (AI placeholder), students, messages; Student/Admin switch in both directions. Dev console shows one Suspense warning per page (Next.js dev-only, not a runtime error). Also opened without errors: student community (Report placeholders), calls, announcements, certificates, lesson player (video placeholder); admin plans, communities, announcements, calls.
- Forms tested in the browser (internal only): admin announcement saved as draft; admin course created as draft and a module added to it (both were removed afterwards); account details saved unchanged.
- Student-only account, created and deleted by a test script (no email sent): all student pages load with status 200; all admin pages redirect to `/learn` (307). Checked over HTTP, not in the browser.
- Admin student detail page (`/admin/students/[id]`) renders with progress, video events and certificates.
- Student queries now filter by the signed-in user explicitly (courses, lesson progress, quiz answers, certificates, points, resume lesson). Admin accounts used to see other students' rows on these pages.
- Admin area guard: logged-out requests to `/admin/*` are redirected to `/login` (checked on the production build).
- Database checks: 40 local checks across migrations 0001–0003.
- Student data check against the hosted dev project through row-level security (see the seed and verification notes in `docs/dev-setup.md`).

## Not verified yet

- Design pass: contrast and card separation reviewed in the browser (2026-11-26). Typography and the stats row still need a full visual review.
- Dashboard two-column layout: reviewed in the browser (2026-11-26); panels are now boxed cards.
- Sample content now includes two courses, three lessons in the second course, announcements, a live call, a past call, community posts and messages. All labelled (sample).
- To give any dev account the sample membership and activity: node --env-file=.env.local scripts/dev-seed.mjs --grant=EMAIL

- Signed-in pages (student and admin) opened in the browser. Not yet opened: sign-up, forgot-password, reset-password, auth error and setup pages.
- Not submitted on purpose, because they send email, notify students, or change credentials: invite student, send password reset, change password, send admin message, publish announcement, add membership or extend or end it, remove student, create community, new plan, new community post. Each needs a test account and an approved plan first.
- Community post and delete flow: a post attempt was blocked by the permission system (it would appear to other members), so not tested. Delete own post still untested.
- Admin dashboard forms not yet submitted: invites, memberships, Stream video ids, admin messages, course quick checks.
- Accessibility audit: not done with a screen reader or an automated tool. Checked from code: page language set, focus ring defined, images have alt text. Muted text on card background is above 4.5:1 by estimate, not measured.
- Video playback (needs item 1).
- End-to-end sign-in and sign-up through the browser with a real invite and reset email.
