// Seeds the DEV Supabase project with sample content and one test student.
// Run:  node --env-file=.env.local scripts/dev-seed.mjs
//
// Safety: refuses to run unless the URL is the dev project, and never prints keys.
// Sample data is for development only. Do not run this against production.
import { createClient } from "@supabase/supabase-js";

const DEV_PROJECT_REF = "bqziqwehhyctibzxexfs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
if (!url.includes(DEV_PROJECT_REF)) {
  console.error("Refusing to run: this script only seeds the dev project.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const day = 24 * 60 * 60 * 1000;
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

async function ensure(table, match, row, what) {
  const found = must(await admin.from(table).select("*").match(match).maybeSingle(), `${what} lookup`);
  if (found) return found;
  return must(await admin.from(table).insert(row).select().single(), what);
}

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`list users: ${error.message}`);
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureUser(email, fullName) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(), // random; the real student sets their own via invite
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`create user ${email}: ${error.message}`);
  return data.user;
}

// --- catalogue ---
const plan = await ensure("plans", { slug: "full-course" }, {
  slug: "full-course",
  name: "Full Course",
  description: "Sample plan for development.",
  access_duration_days: 90,
  is_active: true,
}, "plan");

const course = await ensure("courses", { slug: "sales-fundamentals" }, {
  slug: "sales-fundamentals",
  title: "Sales Fundamentals (sample)",
  description: "Sample course for development. Replace with real content.",
  status: "published",
  sort_order: 1,
}, "course");

await ensure("plan_courses", { plan_id: plan.id, course_id: course.id }, { plan_id: plan.id, course_id: course.id }, "plan_course");

const module1 = await ensure("modules", { course_id: course.id, sort_order: 1 }, {
  course_id: course.id,
  title: "Foundations",
  description: "The basics of a sales conversation.",
  status: "published",
  sort_order: 1,
}, "module");

const lesson1 = await ensure("lessons", { module_id: module1.id, sort_order: 1 }, {
  module_id: module1.id,
  title: "Welcome",
  description: "What you'll learn in this course.",
  duration_seconds: 120,
  status: "published",
  sort_order: 1,
  stream_uid: null, // set to a Cloudflare Stream video id once the video is uploaded
}, "lesson 1");

const lesson2 = await ensure("lessons", { module_id: module1.id, sort_order: 2 }, {
  module_id: module1.id,
  title: "Handling price objections",
  description: "Turning 'it's too expensive' into a conversation about value.",
  duration_seconds: 300,
  status: "published",
  sort_order: 2,
  stream_uid: null,
}, "lesson 2");

// Quiz on lesson 2 at 60 seconds, approved, with one correct option.
const existingQ = must(await admin.from("lesson_questions").select("id").eq("lesson_id", lesson2.id).limit(1), "question lookup");
if (existingQ.length === 0) {
  const q = must(await admin.from("lesson_questions").insert({
    lesson_id: lesson2.id,
    source: "admin",
    question_text: "What is the best first response to 'it's too expensive'?",
    show_at_seconds: 60,
    points: 2,
    explanation: "Ask what they are comparing the price with. It opens the value conversation.",
    is_approved: true,
    sort_order: 1,
  }).select().single(), "question");
  must(await admin.from("question_options").insert([
    { question_id: q.id, option_text: "Offer a discount straight away", is_correct: false, sort_order: 1 },
    { question_id: q.id, option_text: "Ask what they are comparing the price with", is_correct: true, sort_order: 2 },
    { question_id: q.id, option_text: "Agree that it is expensive", is_correct: false, sort_order: 3 },
  ]), "options");
}

// --- second course and more sample content (all labelled "sample") ---
const course2 = await ensure("courses", { slug: "objection-handling" }, {
  slug: "objection-handling",
  title: "Objection Handling (sample)",
  description: "Sample course: the objections you will hear most, and how to work through them.",
  status: "published",
  sort_order: 2,
}, "course 2");
await ensure("plan_courses", { plan_id: plan.id, course_id: course2.id }, { plan_id: plan.id, course_id: course2.id }, "plan_course 2");

const mod2 = await ensure("modules", { course_id: course2.id, sort_order: 1 }, {
  course_id: course2.id,
  title: "Core objections",
  description: "The three objections that come up in almost every sales call.",
  status: "published",
  sort_order: 1,
}, "module 2");

const course2Lessons = [
  ["Too expensive, revisited", 240],
  ["I need to think about it", 200],
  ["I need to talk to my partner", 180],
];
for (const [i, [title, duration]] of course2Lessons.entries()) {
  await ensure("lessons", { module_id: mod2.id, sort_order: i + 1 }, {
    module_id: mod2.id,
    title,
    description: `Sample lesson: ${title.toLowerCase()}.`,
    duration_seconds: duration,
    status: "published",
    sort_order: i + 1,
    stream_uid: null,
  }, `lesson ${title}`);
}

for (const [title, offset] of [
  ["New module: Objection handling (sample)", -3 * day],
  ["Office hours this Friday (sample)", -1 * day],
  ["Community guidelines updated (sample)", -10 * day],
]) {
  await ensure("announcements", { title }, {
    title,
    body: "Sample announcement. Replace this text with real content before launch.",
    community_id: null,
    published_at: iso(offset),
  }, "announcement " + title);
}

await ensure("group_calls", { title: "Live Q&A (sample)" }, {
  title: "Live Q&A (sample)",
  description: "Sample call that is live now, so you can see the join state.",
  starts_at: iso(-10 * 60 * 1000),
  duration_minutes: 60,
  join_url: "https://example.com/sample-live-call",
  community_id: null,
}, "live call");
await ensure("group_calls", { title: "Last week: objection drills (sample)" }, {
  title: "Last week: objection drills (sample)",
  description: "Sample past call.",
  starts_at: iso(-7 * day),
  duration_minutes: 45,
  join_url: null,
  community_id: null,
}, "past call");

// --- community, announcement, call ---
const community = await ensure("communities", { slug: "full-course-community" }, {
  slug: "full-course-community",
  name: "Full Course Community",
  description: "Members of the Full Course plan.",
  is_active: true,
}, "community");
await ensure("community_plans", { community_id: community.id, plan_id: plan.id }, { community_id: community.id, plan_id: plan.id }, "community_plan");

await ensure("announcements", { title: "Welcome to the portal (sample)" }, {
  title: "Welcome to the portal (sample)",
  body: "This is a sample announcement for development.",
  community_id: null,
  published_at: iso(-60 * 60 * 1000),
}, "announcement");

await ensure("group_calls", { title: "Weekly group coaching (sample)" }, {
  title: "Weekly group coaching (sample)",
  description: "Sample call for development.",
  starts_at: iso(2 * day),
  duration_minutes: 60,
  join_url: null,
  community_id: community.id,
}, "group call");

// --- test student and admin ---
const student = await ensureUser("student.dev@example.com", "Dev Student");
const nick = await ensureUser("nick.dev@example.com", "Nick (dev)");
must(await admin.from("profiles").update({ role: "admin" }).eq("id", nick.id), "make admin");

await ensure("enrollments", { user_id: student.id, plan_id: plan.id }, {
  user_id: student.id,
  plan_id: plan.id,
  source: "manual",
  status: "active",
  starts_at: iso(-1 * day),
  expires_at: iso(30 * day),
}, "enrollment");

const conv = must(await admin.from("conversations").select("id").eq("title", "Dev Student and Nick (sample)").maybeSingle(), "thread lookup");
if (!conv) {
  const created = must(await admin.from("conversations").insert({ title: "Dev Student and Nick (sample)" }).select().single(), "thread");
  must(await admin.from("conversation_participants").insert([
    { conversation_id: created.id, user_id: student.id },
    { conversation_id: created.id, user_id: nick.id },
  ]), "thread members");
  must(await admin.from("messages").insert({ conversation_id: created.id, sender_id: nick.id, body: "Welcome! Ask me anything here." }), "first message");
}

// Sample progress, quiz answer, points and certificate for one account. Safe to run again.
async function seedActivity(userId) {
  const quiz = must(await admin.from("lesson_questions").select("id, points").eq("lesson_id", lesson2.id).single(), "quiz");
  const correct = must(await admin.from("question_options").select("id").eq("question_id", quiz.id).eq("is_correct", true).single(), "correct option");

  must(await admin.from("lesson_progress").upsert([
    { user_id: userId, lesson_id: lesson1.id, furthest_position_seconds: 120, last_position_seconds: 120, watched_seconds: 118, completed_at: iso(-2 * day), first_interaction_at: iso(-2 * day), last_event_at: iso(-2 * day) },
    { user_id: userId, lesson_id: lesson2.id, furthest_position_seconds: 90, last_position_seconds: 90, watched_seconds: 92, completed_at: null, first_interaction_at: iso(-1 * day), last_event_at: iso(-60 * 60 * 1000) },
  ], { onConflict: "user_id,lesson_id" }), "sample progress");
  must(await admin.from("lesson_events").insert([
    { user_id: userId, lesson_id: lesson1.id, event_type: "play", position_seconds: 0, occurred_at: iso(-2 * day) },
    { user_id: userId, lesson_id: lesson1.id, event_type: "ended", position_seconds: 120, occurred_at: iso(-2 * day) },
    { user_id: userId, lesson_id: lesson2.id, event_type: "play", position_seconds: 0, occurred_at: iso(-1 * day) },
    { user_id: userId, lesson_id: lesson2.id, event_type: "pause", position_seconds: 90, occurred_at: iso(-60 * 60 * 1000) },
  ]), "sample events");
  must(await admin.from("question_attempts").upsert({ user_id: userId, question_id: quiz.id, selected_option_id: correct.id, is_correct: true, points_awarded: quiz.points }, { onConflict: "user_id,question_id", ignoreDuplicates: true }), "sample attempt");
  must(await admin.from("points_ledger").upsert({ user_id: userId, points: quiz.points, source_type: "question", source_id: quiz.id }, { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true }), "sample points");
  must(await admin.from("certificates").upsert({ user_id: userId, course_id: course.id, certificate_number: "SAMPLE-" + userId.slice(0, 8).toUpperCase() }, { onConflict: "user_id,course_id", ignoreDuplicates: true }), "sample certificate");
}

await seedActivity(student.id);

const posts = must(await admin.from("community_posts").select("id").eq("community_id", community.id).limit(1), "post lookup");
if (posts.length === 0) {
  must(await admin.from("community_posts").insert([
    { community_id: community.id, author_id: nick.id, body: "Welcome to the community (sample). Introduce yourself below!" },
    { community_id: community.id, author_id: student.id, body: "Hi everyone, excited to start (sample post)." },
  ]), "sample posts");
}

const thread = must(await admin.from("conversations").select("id").eq("title", "Dev Student and Nick (sample)").maybeSingle(), "thread");
if (thread) {
  const msgs = must(await admin.from("messages").select("id").eq("conversation_id", thread.id).limit(2), "msg lookup");
  if (msgs.length < 2) must(await admin.from("messages").insert({ conversation_id: thread.id, sender_id: student.id, body: "Thanks! (sample reply)" }), "sample reply");
}

// More sample posts and messages (added only if missing).
for (const body of [
  "Anyone tried the price objection drill this week? (sample)",
  "Sharing my win: closed a call using the value question (sample).",
]) {
  const exists = must(await admin.from("community_posts").select("id").eq("body", body).limit(1), "post check");
  if (exists.length === 0) must(await admin.from("community_posts").insert({ community_id: community.id, author_id: student.id, body }), "post");
}
if (thread) {
  const count = must(await admin.from("messages").select("id").eq("conversation_id", thread.id), "message count");
  if (count.length < 4) {
    must(await admin.from("messages").insert([
      { conversation_id: thread.id, sender_id: nick.id, body: "Great first week. Send me your best objection call recording when ready (sample)." },
      { conversation_id: thread.id, sender_id: student.id, body: "Will do, thank you (sample)." },
    ]), "more messages");
  }
}

// Invite link for the student. Generated here instead of emailed, so no real email is sent.
const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: "invite",
  email: student.email,
});
if (linkError) {
  // Already active: issue a password-reset link instead, so the student can still get in.
  const { data: recovery, error: recoveryError } = await admin.auth.admin.generateLink({ type: "recovery", email: student.email });
  if (recoveryError) throw new Error(`could not generate a sign-in link: ${recoveryError.message}`);
  console.log("\nStudent already exists. Password-reset link (valid for a limited time, one use):");
  console.log(`${siteUrl}/auth/confirm?token_hash=${recovery.properties?.hashed_token}&type=recovery`);
} else {
  const tokenHash = link.properties?.hashed_token;
  console.log("\nStudent invite link (valid for a limited time, one use):");
  console.log(`${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=invite`);
}

// Optional: grant the sample membership to an existing account (for example your own sign-in).
// Usage: node --env-file=.env.local scripts/dev-seed.mjs --grant=you@example.com
const grantArg = process.argv.find((a) => a.startsWith("--grant="));
if (grantArg) {
  const email = grantArg.slice("--grant=".length).trim().toLowerCase();
  const target = await findUserByEmail(email);
  if (!target) {
    throw new Error(`No account with email ${email}. Sign in once (or sign up) with it, then run this again.`);
  }
  await ensure("enrollments", { user_id: target.id, plan_id: plan.id }, {
    user_id: target.id,
    plan_id: plan.id,
    source: "manual",
    status: "active",
    starts_at: iso(-1 * day),
    expires_at: iso(30 * day),
  }, "grant enrollment");
  await seedActivity(target.id);
  console.log(`Granted the sample membership to ${email}. Refresh the dashboard.`);
}

console.log("\nSeed complete. Test student: student.dev@example.com");
