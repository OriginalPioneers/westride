import { auth } from "@clerk/nextjs/server";
import { ACHIEVEMENT_SLUG, type AchievementSlug } from "@westride/db";
import { awardAchievement } from "@westride/db/client";

/**
 * Records Newbie for the signed-in account, then `slug` when it is a
 * different achievement. Guests are ignored. Returns the Clerk user id.
 */
export async function awardIfSignedIn(
  slug: AchievementSlug = ACHIEVEMENT_SLUG.newbie,
): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  await awardAchievement(userId, ACHIEVEMENT_SLUG.newbie);
  if (slug !== ACHIEVEMENT_SLUG.newbie) {
    await awardAchievement(userId, slug);
  }
  return userId;
}
