import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { metadataGrantsAdmin } from "./admin-auth";

/** Clerk's user record, as the bundled backend client returns it. */
type User = Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>;

/** What the portal shows about a Clerk account. Serialisable, so it can cross to client components. */
export type AdminUserProfile = {
  clerkUserId: string;
  name: string;
  email: string | null;
  username: string | null;
  imageUrl: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  isLocked: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
};

export const USER_PAGE_SIZE = 50;
const LOOKUP_PAGE_SIZE = 100;

function displayName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "WeStride member";
}

export function toProfile(user: User): AdminUserProfile {
  return {
    clerkUserId: user.id,
    name: displayName(user),
    email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
    username: user.username,
    imageUrl: user.hasImage ? user.imageUrl : null,
    isAdmin: metadataGrantsAdmin(user.publicMetadata),
    isBanned: user.banned,
    isLocked: user.locked,
    createdAt: new Date(user.createdAt).toISOString(),
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
    lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
  };
}

export type UserListResult = {
  users: AdminUserProfile[];
  total: number;
  page: number;
  pageSize: number;
};

/** One page of accounts from Clerk, newest first, optionally narrowed by a search. */
export async function listUsers(params: { query?: string; page?: number }): Promise<UserListResult> {
  const page = Math.max(Math.trunc(params.page ?? 1), 1);
  const query = params.query?.trim() || undefined;
  const client = await clerkClient();
  const { data, totalCount } = await client.users.getUserList({
    query,
    limit: USER_PAGE_SIZE,
    offset: (page - 1) * USER_PAGE_SIZE,
    orderBy: "-created_at",
  });
  return { users: data.map(toProfile), total: totalCount, page, pageSize: USER_PAGE_SIZE };
}

export async function countUsers(): Promise<number> {
  const client = await clerkClient();
  return client.users.getCount();
}

export async function getUserProfile(clerkUserId: string): Promise<AdminUserProfile | null> {
  try {
    const client = await clerkClient();
    return toProfile(await client.users.getUser(clerkUserId));
  } catch {
    return null;
  }
}

function fallbackProfile(clerkUserId: string): AdminUserProfile {
  return {
    clerkUserId,
    name: "Unknown account",
    email: null,
    username: null,
    imageUrl: null,
    isAdmin: false,
    isBanned: false,
    isLocked: false,
    createdAt: new Date(0).toISOString(),
    lastSignInAt: null,
    lastActiveAt: null,
  };
}

/**
 * Names and emails for a set of Clerk ids, for the owner columns in tables.
 * Accounts Clerk no longer has, or a Clerk outage, fall back to a label so
 * the page still renders.
 */
export async function resolveProfiles(clerkUserIds: Iterable<string | null | undefined>): Promise<Map<string, AdminUserProfile>> {
  const ids = [...new Set([...clerkUserIds].filter((id): id is string => Boolean(id)))];
  const profiles = new Map(ids.map((id) => [id, fallbackProfile(id)]));
  if (ids.length === 0) {
    return profiles;
  }
  try {
    const client = await clerkClient();
    for (let start = 0; start < ids.length; start += LOOKUP_PAGE_SIZE) {
      const batch = ids.slice(start, start + LOOKUP_PAGE_SIZE);
      const { data } = await client.users.getUserList({ userId: batch, limit: LOOKUP_PAGE_SIZE });
      for (const user of data) {
        profiles.set(user.id, toProfile(user));
      }
    }
  } catch (error) {
    console.error("Clerk profile lookup failed", error);
  }
  return profiles;
}

/** Grants or revokes the admin role by editing the account's public metadata. */
export async function setAdminRole(clerkUserId: string, role: string, grant: boolean): Promise<AdminUserProfile> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const metadata = (user.publicMetadata ?? {}) as { role?: unknown; roles?: unknown };
  const roles = new Set(Array.isArray(metadata.roles) ? metadata.roles.filter((entry): entry is string => typeof entry === "string") : []);
  if (grant) {
    roles.add(role);
  } else {
    roles.delete(role);
  }
  const updated = await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      // Setting a key to null removes it from the deep merge.
      role: grant ? role : metadata.role === role ? null : metadata.role,
      roles: roles.size > 0 ? [...roles] : null,
    },
  });
  return toProfile(updated);
}
