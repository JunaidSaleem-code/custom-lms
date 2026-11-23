import "server-only";
import { cookies } from "next/headers";

// Marks a browser that verified an invite or reset link within the last 15 minutes.
// Only that browser may set a password without the current one. A normal login session can't.
export const AUTH_FLOW_COOKIE = "sc_auth_flow";
export const AUTH_FLOW_TTL_SECONDS = 15 * 60;

export type AuthFlow = "invite" | "recovery";

const isProduction = process.env.NODE_ENV === "production";

export async function setAuthFlow(flow: AuthFlow): Promise<void> {
  (await cookies()).set(AUTH_FLOW_COOKIE, flow, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: AUTH_FLOW_TTL_SECONDS,
  });
}

export async function getAuthFlow(): Promise<AuthFlow | null> {
  const value = (await cookies()).get(AUTH_FLOW_COOKIE)?.value;
  return value === "invite" || value === "recovery" ? value : null;
}

export async function clearAuthFlow(): Promise<void> {
  (await cookies()).delete({ name: AUTH_FLOW_COOKIE, path: "/" });
}
