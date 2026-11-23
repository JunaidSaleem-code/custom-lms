# Placeholders and open items

Single source of truth for everything that is not finished yet. Update this file in the same change that finishes or adds an item. Last updated: 2026-11-23.

Status key: **Open** = not started. **Blocked** = waiting on a client decision or account. **Sample** = works, but uses seeded sample data.

## Blocked on client decisions

| # | Item | Where it shows | Needs |
|---|---|---|---|
| 1 | Lesson video playback | Lesson page, player placeholder text | Cloudflare Stream signing key, and each lesson's `stream_uid` |
| 2 | Certificate eligibility rule | Certificates page empty-state text | Which courses issue certificates, and what counts as complete |
| 3 | Membership renewal | Membership banner ("contact the team") | Renewal link or process, and plan durations |
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

## Not built yet

| # | Item | Planned phase | Notes |
|---|---|---|---|
| 14 | Admin dashboard (students, invites, plans, course builder, analytics) | Phase 2 | Admin RLS exists. Admin UI and server routes do not. |
| 15 | Stripe checkout and webhook enrollment sync | Phase 3 | Enrollments are manual until then. |
| 16 | Onboarding and expiry emails | Phase 3 | Currently only Supabase auth emails. |
| 17 | Expiry job (`pg_cron`) | Phase 3 | SQL is commented out in migration 0001. Access is still date-checked. |
| 18 | AI question generation and admin review | Phase 4 | Schema ready (`source = 'ai'`, `is_approved`). |
| 19 | AI voice roleplay and reports | Phase 5 | Required for first release. Provider decision needed. |
| 20 | Leaderboards and weekly challenges | Phase 6 | Depends on item 4. |
| 21 | Avatar upload | Phase 2 | `profiles.avatar_path` exists, no UI. |
| 22 | Push notifications and installable app (PWA) | Phase 7 | Manifest, icons, service worker not added. |
| 23 | Message thread creation by students | Undecided | Admin creates threads today. |
| 24 | Community moderation (reporting, pinning) | Phase 6 | Authors can delete own posts only. |
| 25 | Analytics events | Phase 2 | Event names to be defined before admin analytics. |
| 26 | Custom SMTP for emails | Before launch | Supabase's built-in email is rate-limited. |
| 27 | Multi-factor sign-in for admins | Before launch | Planned with admin dashboard. |

## Verified

- Typecheck, lint, 60 unit tests, production build.
- Database checks: 40 local checks across migrations 0001–0003.
- Student data check against the hosted dev project through row-level security (see the seed and verification notes in `docs/dev-setup.md`).

## Not verified yet

- Design pass (typography, dashboard hero, stats row) applied and built. Needs a visual review in a browser.
- Sample student data (seed script) checked through row-level security, not yet through the browser.
- Dashboard redesigned as a two-column layout (resume lesson and course rows on the left, next call and announcements on the right). Needs a visual review.
- Sample content now includes two courses, three lessons in the second course, announcements, a live call, a past call, community posts and messages. All labelled (sample).
- To give any dev account the sample membership and activity: node --env-file=.env.local scripts/dev-seed.mjs --grant=EMAIL

- Real browser testing of every page (not yet run in a browser by the team).
- Accessibility audit (keyboard, screen reader, contrast of the final design).
- Video playback (needs item 1).
- End-to-end sign-in and sign-up through the browser with a real invite and reset email.
