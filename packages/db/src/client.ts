import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Lesson, Track } from "./schema";

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
    orderBy: (track, { asc }) => [asc(track.name)],
    with: {
      lessons: {
        orderBy: (lesson, { asc }) => [asc(lesson.name)],
      },
    },
  });
}
