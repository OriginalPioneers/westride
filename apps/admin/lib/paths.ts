export const signInPath = "/sign-in";
export const afterAuthPath = "/";

export const ADMIN_PATHS = {
  dashboard: "/",
  users: "/users",
  ideas: "/ideas",
  projects: "/projects",
  agents: "/agents",
  pledges: "/pledges",
  devices: "/devices",
  codes: "/codes",
} as const;

export function userPath(clerkUserId: string): string {
  return `${ADMIN_PATHS.users}/${encodeURIComponent(clerkUserId)}`;
}

/** The member-facing site, for "open on WeStride" links. */
export const SITE_URL = (process.env.NEXT_PUBLIC_WESTRIDE_SITE_URL || "https://www.westride.org").replace(/\/$/, "");

export function siteIdeaUrl(id: string): string {
  return `${SITE_URL}/ideas/${id}`;
}

export function siteProjectUrl(id: string): string {
  return `${SITE_URL}/build/${id}`;
}

export function siteAgentUrl(id: string): string {
  return `${SITE_URL}/agents/${id}`;
}
