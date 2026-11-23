// Only allow same-site relative paths after login. Blocks open redirects such as
// "https://evil.example", "//evil.example" and "/\evil.example".
export function safeNextPath(next: string | null | undefined, fallback = "/learn"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
