import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, isNotNull, lt, or } from "drizzle-orm";
import { getDb } from "./client";
import { socialPosts as posts } from "./social-schema";
import {
  dayInZone,
  sharedPostUrl,
  validTimeZone,
  type SocialPlatform,
} from "./social-progress";
export type { SocialPost } from "./social-schema";
const owned = (user: string, id: string) =>
  and(eq(posts.clerkUserId, user), eq(posts.id, id));
const idle = () => or(isNull(posts.busyUntil), lt(posts.busyUntil, new Date()));
export async function listSocialPosts(user: string) {
  return getDb()
    .select()
    .from(posts)
    .where(eq(posts.clerkUserId, user))
    .orderBy(desc(posts.createdAt));
}
export async function getSocialPost(user: string, id: string) {
  return (
    (await getDb().select().from(posts).where(owned(user, id)).limit(1))[0] ??
    null
  );
}
export async function beginSocialPost(
  user: string,
  id: string,
  platform: SocialPlatform,
  brief: string,
) {
  await getDb()
    .insert(posts)
    .values({ id, clerkUserId: user, platform, brief })
    .onConflictDoNothing();
  const post = await getSocialPost(user, id);
  if (!post || post.platform !== platform || post.brief !== brief)
    throw new Error("Start a new draft for a different platform or topic.");
  return post;
}
export async function claimSocialGeneration(user: string, id: string) {
  return (
    (
      await getDb()
        .update(posts)
        .set({
          operationId: randomUUID(),
          busyUntil: new Date(Date.now() + 45000),
        })
        .where(
          and(
            owned(user, id),
            isNull(posts.generatedAt),
            isNull(posts.sharedAt),
            idle(),
          ),
        )
        .returning()
    )[0] ?? null
  );
}
export async function finishSocialGeneration(
  user: string,
  id: string,
  operationId: string,
  body?: string,
) {
  await getDb()
    .update(posts)
    .set({
      busyUntil: null,
      operationId: null,
      ...(body ? { body, generatedAt: new Date() } : {}),
    })
    .where(and(owned(user, id), eq(posts.operationId, operationId)));
  return getSocialPost(user, id);
}
export async function saveSocialBody(user: string, id: string, body: string) {
  const row = (
    await getDb()
      .update(posts)
      .set({ body })
      .where(and(owned(user, id), isNull(posts.sharedAt), idle()))
      .returning()
  )[0];
  if (!row) throw new Error("This draft is unavailable or already shared.");
  return row;
}
export async function socialTimeZone(user: string, fallback: string) {
  if (!validTimeZone(fallback)) throw new Error("Choose a valid time zone.");
  return (
    (
      await getDb()
        .select({ timeZone: posts.timeZone })
        .from(posts)
        .where(and(eq(posts.clerkUserId, user), isNotNull(posts.sharedAt)))
        .orderBy(asc(posts.sharedAt))
        .limit(1)
    )[0]?.timeZone ?? fallback
  );
}
export async function confirmSocialPost(
  user: string,
  id: string,
  url: string,
  timeZone: string,
) {
  const post = await getSocialPost(user, id);
  if (!post || !post.body.trim()) throw new Error("Save your post text first.");
  const normalized = sharedPostUrl(url, post.platform as SocialPlatform);
  if (!normalized)
    throw new Error(
      "Paste a link to the published post on the selected platform.",
    );
  if (post.sharedAt) {
    if (post.sharedUrl === normalized) return post;
    throw new Error(
      "This draft is already confirmed. Start a new draft for another post.",
    );
  }
  const zone = await socialTimeZone(user, timeZone);
  const now = new Date();
  const saved = (
    await getDb()
      .update(posts)
      .set({
        sharedUrl: normalized,
        sharedAt: now,
        sharedDay: dayInZone(now, zone),
        timeZone: zone,
      })
      .where(and(owned(user, id), isNull(posts.sharedAt), idle()))
      .returning()
  )[0];
  if (!saved) throw new Error("This post is being updated. Try again.");
  return saved;
}
export async function recordSocialEngagement(
  user: string,
  id: string,
  engagement: string,
) {
  const saved = (
    await getDb()
      .update(posts)
      .set({ engagement })
      .where(and(owned(user, id), isNotNull(posts.sharedAt)))
      .returning()
  )[0];
  if (!saved) throw new Error("Confirm your published post first.");
  return saved;
}
