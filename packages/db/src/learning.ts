import { socialProgress } from "./social-progress";
import { socialPosts } from "./social-schema";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  achievementCatalog,
  type AchievementSlug,
} from "./achievement-catalog";
import {
  challengePrompt,
  learningAwards,
  isChangedAnswer,
  type Interest,
  type Depth,
} from "./challenge-catalog";
import {
  learningAttempts as attempts,
  learningMuseBudgets as budgets,
  type LearningFeedback,
} from "./learning-schema";
import {
  achievements,
  userAchievements,
  ideaMembers,
  ideaBuilderEvents,
} from "./schema";
export type { LearningAttempt, LearningFeedback } from "./learning-schema";
const owned = (user: string, id: string) =>
  and(eq(attempts.clerkUserId, user), eq(attempts.id, id));
const idle = () =>
  or(isNull(attempts.busyUntil), lt(attempts.busyUntil, new Date()));
export async function listLearningAttempts(user: string) {
  return getDb().select().from(attempts).where(eq(attempts.clerkUserId, user));
}
export async function getLearningAttempt(user: string, id: string) {
  return (
    (
      await getDb().select().from(attempts).where(owned(user, id)).limit(1)
    )[0] ?? null
  );
}
export async function beginLearningAttempt(
  user: string,
  slug: string,
  interest: Interest,
  depth: Depth,
) {
  await getDb()
    .insert(attempts)
    .values({
      clerkUserId: user,
      challengeSlug: slug,
      interest,
      depth,
      prompt: challengePrompt(slug, interest, depth),
    })
    .onConflictDoNothing();
  return (
    await getDb()
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.clerkUserId, user),
          eq(attempts.challengeSlug, slug),
          eq(attempts.interest, interest),
        ),
      )
      .limit(1)
  )[0];
}
export async function saveLearningDraft(
  user: string,
  id: string,
  answer: string,
) {
  await getDb()
    .update(attempts)
    .set({ answer })
    .where(
      and(
        owned(user, id),
        isNull(attempts.feedback),
        isNull(attempts.completedAt),
        idle(),
      ),
    );
  return getLearningAttempt(user, id);
}
export async function claimLearningFeedback(
  user: string,
  id: string,
  answer: string,
) {
  const operationId = randomUUID();
  return (
    (
      await getDb()
        .update(attempts)
        .set({ answer, operationId, busyUntil: new Date(Date.now() + 45_000) })
        .where(and(owned(user, id), isNull(attempts.feedback), idle()))
        .returning()
    )[0] ?? null
  );
}
export async function releaseLearningFeedback(
  user: string,
  id: string,
  operationId: string,
  feedback?: LearningFeedback,
) {
  await getDb()
    .update(attempts)
    .set({
      busyUntil: null,
      operationId: null,
      ...(feedback ? { feedback } : {}),
    })
    .where(and(owned(user, id), eq(attempts.operationId, operationId)));
}
export async function reserveLearningCall(user: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  // Atomic counters work across server instances. Failed calls also consume quota.
  for (const [key, limit] of [
    [`user:${user}:${day}`, 12],
    [`global:${day}`, 64],
  ] as const) {
    const rows = await getDb()
      .insert(budgets)
      .values({ key, calls: 1 })
      .onConflictDoUpdate({
        target: budgets.key,
        set: { calls: sql`${budgets.calls} + 1` },
        setWhere: lt(budgets.calls, limit),
      })
      .returning();
    if (!rows.length) return false;
  }
  return true;
}
export async function reviseLearningAnswer(
  user: string,
  id: string,
  revision: string,
) {
  const attempt = await getLearningAttempt(user, id);
  if (!attempt?.feedback || !isChangedAnswer(attempt.answer, revision))
    throw new Error("Change your answer after reading Muse's feedback.");
  await getDb()
    .update(attempts)
    .set({ revision })
    .where(and(owned(user, id), idle()));
  await syncLearningAwards(user);
  return getLearningAttempt(user, id);
}
export async function finishLearningAttempt(user: string, id: string) {
  const attempt = await getLearningAttempt(user, id);
  if (!attempt?.answer.trim()) throw new Error("Save your answer first.");
  await getDb()
    .update(attempts)
    .set({ completedAt: new Date() })
    .where(and(owned(user, id), isNull(attempts.completedAt), idle()));
  await syncLearningAwards(user);
  return getLearningAttempt(user, id);
}
export async function syncLearningAwards(user: string) {
  const eligible = learningAwards(await listLearningAttempts(user));
  const idea = await getDb()
    .select({ id: ideaMembers.ideaId })
    .from(ideaMembers)
    .where(
      and(eq(ideaMembers.clerkUserId, user), eq(ideaMembers.role, "FOUNDER")),
    )
    .limit(1);
  if (idea.length) eligible.push("first-spark");
  const builder = await getDb()
    .select({ slug: ideaBuilderEvents.achievementSlug })
    .from(ideaBuilderEvents)
    .where(eq(ideaBuilderEvents.clerkUserId, user));
  eligible.push(...builder.map((event) => event.slug));
  const social = await getDb()
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.clerkUserId, user));
  eligible.push(
    ...socialProgress(social, new Date().toISOString().slice(0, 10)).slugs,
  );
  const valid = new Set(achievementCatalog.map((a) => a.slug));
  const slugs = eligible.filter((slug) => valid.has(slug as AchievementSlug));
  if (!slugs.length) return;
  const rows = await getDb()
    .select({ id: achievements.id })
    .from(achievements)
    .where(inArray(achievements.slug, slugs));
  if (rows.length)
    await getDb()
      .insert(userAchievements)
      .values(rows.map((row) => ({ clerkUserId: user, achievementId: row.id })))
      .onConflictDoNothing();
}
export async function claimAchievementCelebrations(user: string) {
  const claimed = await getDb()
    .update(userAchievements)
    .set({ celebratedAt: new Date() })
    .where(
      and(
        eq(userAchievements.clerkUserId, user),
        isNull(userAchievements.celebratedAt),
      ),
    )
    .returning({ id: userAchievements.achievementId });
  if (!claimed.length) return [];
  const catalog = await getDb().select().from(achievements);
  const ids = new Set(claimed.map((row) => row.id));
  return catalog.filter((row) => ids.has(row.id)).map((row) => row.name);
}
