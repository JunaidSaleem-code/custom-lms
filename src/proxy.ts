import { NextResponse, type NextRequest } from "next/server";
import { missingSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/session";

// Pages that only make sense when logged out.
const LOGGED_OUT_ONLY = new Set(["/login", "/signup", "/forgot-password"]);
// Everything under /learn needs a session. Pages also check this themselves (defence in depth).
const PROTECTED_PREFIX = "/learn";
// Always reachable, even before configuration is complete.
const OPEN_WITHOUT_CONFIG = new Set(["/", "/setup"]);

// Runs on every matched request: keeps the session cookie fresh and applies coarse route rules.
// It is an optimistic check, not the only authorisation. Data access is enforced by RLS.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (missingSupabaseEnv().length > 0) {
    if (OPEN_WITHOUT_CONFIG.has(pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { response, user } = await updateSession(request);

  if (pathname.startsWith(PROTECTED_PREFIX) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (LOGGED_OUT_ONLY.has(pathname) && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/learn";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
