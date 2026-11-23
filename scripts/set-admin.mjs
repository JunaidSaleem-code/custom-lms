// The single admin switch. Turns admin access on or off for one account.
// Usage:
//   node --env-file=.env.local scripts/set-admin.mjs --email=you@example.com        (grant)
//   node --env-file=.env.local scripts/set-admin.mjs --email=you@example.com --off  (revoke)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const emailArg = process.argv.find((a) => a.startsWith("--email="));
const off = process.argv.includes("--off");
if (!emailArg) {
  console.error("Usage: set-admin.mjs --email=you@example.com [--off]");
  process.exit(1);
}
const email = emailArg.slice("--email=".length).trim().toLowerCase();

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// Find the account by email (listUsers is paginated; this project is small).
const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) throw new Error(error.message);
const user = data.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error(`No account with email ${email}. Sign in once with it, then run this again.`);
  process.exit(1);
}

const role = off ? "student" : "admin";
const { error: updateError } = await admin.from("profiles").update({ role }).eq("id", user.id);
if (updateError) throw new Error(updateError.message);

console.log(`${email} is now ${role === "admin" ? "an admin (admin area on)" : "a student (admin area off)"}.`);
