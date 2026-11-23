// THE single place that decides who can open the admin area.
//
// Today: one switch. An account is an admin when its profile role is "admin".
// Turn it on or off with:  node --env-file=.env.local scripts/set-admin.mjs --email=you@example.com [--off]
//
// When roles are introduced later, change only this function (and the set-admin script).
export type AdminCheckProfile = { role: string } | null | undefined;

export function hasAdminAccess(profile: AdminCheckProfile): boolean {
  return profile?.role === "admin";
}
