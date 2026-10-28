import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

export type MemberProfile = {
  clerkUserId: string;
  name: string;
  imageUrl: string | null;
};

const PAGE_SIZE = 100;

function fallbackProfile(clerkUserId: string): MemberProfile {
  return { clerkUserId, name: "WeStride member", imageUrl: null };
}

/**
 * Looks up display names and photos for idea members. Accounts Clerk no
 * longer knows about, or a Clerk outage, fall back to a generic label so the
 * page still renders.
 */
export async function resolveMemberProfiles(
  clerkUserIds: string[],
): Promise<Map<string, MemberProfile>> {
  const ids = [...new Set(clerkUserIds)];
  const profiles = new Map(ids.map((id) => [id, fallbackProfile(id)]));
  if (ids.length === 0) {
    return profiles;
  }

  try {
    const client = await clerkClient();
    for (let start = 0; start < ids.length; start += PAGE_SIZE) {
      const page = ids.slice(start, start + PAGE_SIZE);
      const { data } = await client.users.getUserList({
        userId: page,
        limit: PAGE_SIZE,
      });
      for (const user of data) {
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          fallbackProfile(user.id).name;
        profiles.set(user.id, {
          clerkUserId: user.id,
          name,
          imageUrl: user.hasImage ? user.imageUrl : null,
        });
      }
    }
  } catch (error) {
    console.error("Idea member lookup failed", error);
  }

  return profiles;
}
