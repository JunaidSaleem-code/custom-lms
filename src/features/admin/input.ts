// Pure helpers for admin form input. No database or server-only imports, so they are unit-tested directly.

// "Basic Course (2026)" -> "basic-course-2026". Used for URL slugs when the admin leaves the slug blank.
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Blank = no fixed expiry (null). Otherwise a whole number of days, 1 to 3650.
export function parseAccessDays(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 3650) {
    return { ok: false, error: "Access duration must be a whole number of days, between 1 and 3650 (or blank for no expiry)." };
  }
  return { ok: true, value: n };
}

// The form asks for a percentage (e.g. 90). The database stores a fraction (0.90).
export function parseThresholdPercent(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 1 || n > 100) {
    return { ok: false, error: "Completion threshold must be between 1% and 100%." };
  }
  return { ok: true, value: Math.round(n) / 100 };
}

// Sort order from a form field. Blank means "append to the end" (the caller supplies the default).
export function parseSortOrder(raw: string, fallback: number): number {
  const n = Number(raw.trim());
  if (raw.trim() === "" || !Number.isInteger(n) || n < 0 || n > 100000) return fallback;
  return n;
}

// Seconds from a form field. Blank means "not set" (null).
export function parseSeconds(raw: string, label: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 86400) return { ok: false, error: `${label} must be between 0 and 86400 seconds.` };
  return { ok: true, value: Math.round(n * 100) / 100 };
}
