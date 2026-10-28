import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { AchievementSlug } from "./achievement-catalog";
import * as schema from "./schema";
import {
  achievements,
  tracks,
  userAchievements,
  type Achievement,
  type Lesson,
  type Track,
} from "./schema";

export type TrackWithLessons = Track & {
  lessons: Lesson[];
};

type Database = NeonHttpDatabase<typeof schema>;

let database: Database | undefined;

export function getDb(): Database {
  if (database) {
    return database;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  database = drizzle({ client: neon(url), schema });
  return database;
}

export async function listTracksWithLessons(): Promise<TrackWithLessons[]> {
  return getDb().query.tracks.findMany({
    orderBy: (track, { asc }) => [asc(track.sortOrder), asc(track.name)],
    with: {
      lessons: {
        orderBy: (lesson, { asc }) => [asc(lesson.name)],
      },
    },
  });
}

export async function listTracks(): Promise<Track[]> {
  return getDb().query.tracks.findMany({
    orderBy: (track, { asc }) => [asc(track.sortOrder), asc(track.name)],
  });
}

export async function getTrackWithLessons(
  slug: string,
): Promise<TrackWithLessons | null> {
  const track = await getDb().query.tracks.findFirst({
    where: eq(tracks.slug, slug),
    with: {
      lessons: {
        orderBy: (lesson, { asc }) => [asc(lesson.name)],
      },
    },
  });
  return track ?? null;
}

export async function listTrackNamesBySlug(
  slugs: string[],
): Promise<Pick<Track, "slug" | "name">[]> {
  if (slugs.length === 0) {
    return [];
  }

  return getDb().query.tracks.findMany({
    where: inArray(tracks.slug, slugs),
    columns: { slug: true, name: true },
  });
}

export type AchievementWithProgress = Achievement & {
  earnedAt: Date | null;
};

export async function awardAchievement(
  clerkUserId: string,
  slug: AchievementSlug,
): Promise<void> {
  if (!clerkUserId) {
    throw new Error("A signed-in user is required to earn an achievement.");
  }

  const db = getDb();
  const achievement = await db.query.achievements.findFirst({
    where: eq(achievements.slug, slug),
    columns: { id: true },
  });

  if (!achievement) {
    throw new Error(`Unknown achievement: ${slug}`);
  }

  await db
    .insert(userAchievements)
    .values({
      clerkUserId,
      achievementId: achievement.id,
    })
    .onConflictDoNothing({
      target: [userAchievements.clerkUserId, userAchievements.achievementId],
    });
}

export async function listAchievementsForUser(
  clerkUserId: string | null,
): Promise<AchievementWithProgress[]> {
  const db = getDb();
  const catalog = await db.query.achievements.findMany({
    orderBy: (achievement, { asc }) => [
      asc(achievement.sortOrder),
      asc(achievement.name),
    ],
  });

  if (!clerkUserId) {
    return catalog.map((achievement) => ({
      ...achievement,
      earnedAt: null,
    }));
  }

  const earned = await db.query.userAchievements.findMany({
    where: eq(userAchievements.clerkUserId, clerkUserId),
  });
  const earnedAtByAchievement = new Map(
    earned.map((row) => [row.achievementId, row.earnedAt]),
  );

  return catalog.map((achievement) => ({
    ...achievement,
    earnedAt: earnedAtByAchievement.get(achievement.id) ?? null,
  }));
}
