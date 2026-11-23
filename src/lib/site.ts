// Public base URL of this app (used for auth redirects and email links).
export function getSiteUrl(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL;
  if (!v) throw new Error("Missing NEXT_PUBLIC_SITE_URL in .env.local");
  return v.replace(/\/$/, "");
}
