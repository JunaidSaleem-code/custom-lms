// Reads Supabase settings. NEXT_PUBLIC_* values are inlined into browser code at build time.
export function getSupabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  return v;
}

export function getPublishableKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!v) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  return v;
}

// Lists required settings that are empty. Used to show a setup page instead of crashing.
export function missingSupabaseEnv(): string[] {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  return required.filter((name) => !process.env[name]);
}
