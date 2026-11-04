import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { tracks, type Lesson, type Track } from "./schema";

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
        orderBy: (lesson, { asc }) => [asc(lesson.sortOrder)],
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
        orderBy: (lesson, { asc }) => [asc(lesson.sortOrder)],
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
