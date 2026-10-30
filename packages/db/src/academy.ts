import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import {
  lessonArtifacts,
  lessonCompletions,
  lessons,
  tracks,
  type Lesson,
  type LessonArtifact,
  type LessonCompletion,
  type Track,
} from "./schema";

export type { Lesson, LessonArtifact, LessonCompletion, Track } from "./schema";

/** A lesson as listed on a track page: everything but the body. */
export type LessonSummary = Omit<Lesson, "content">;

export type TrackWithLessonSummaries = Track & {
  lessons: LessonSummary[];
};

export type LessonWithContext = Lesson & {
  track: Track;
  artifacts: LessonArtifact[];
  /** Position in the track, starting at 1. */
  position: number;
  previous: Pick<Lesson, "id" | "slug" | "name"> | null;
  next: Pick<Lesson, "id" | "slug" | "name"> | null;
};

const lessonSummaryColumns = {
  id: true,
  trackId: true,
  slug: true,
  name: true,
  summary: true,
  sortOrder: true,
  estimatedDurationMinutes: true,
  keyTakeaways: true,
} as const;

/** Every track with its lessons, lightest shape, in learning order. */
export async function listTracksForAcademy(): Promise<
  TrackWithLessonSummaries[]
> {
  return getDb().query.tracks.findMany({
    orderBy: (track, { asc }) => [asc(track.sortOrder), asc(track.name)],
    with: {
      lessons: {
        columns: lessonSummaryColumns,
        orderBy: (lesson, { asc }) => [asc(lesson.sortOrder)],
      },
    },
  });
}

export async function getTrackForAcademy(
  slug: string,
): Promise<TrackWithLessonSummaries | null> {
  const track = await getDb().query.tracks.findFirst({
    where: eq(tracks.slug, slug),
    with: {
      lessons: {
        columns: lessonSummaryColumns,
        orderBy: (lesson, { asc }) => [asc(lesson.sortOrder)],
      },
    },
  });
  return track ?? null;
}

/** One lesson with its track, artifacts, and neighbours for navigation. */
export async function getLesson(
  trackSlug: string,
  lessonSlug: string,
): Promise<LessonWithContext | null> {
  const db = getDb();
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.slug, trackSlug),
  });
  if (!track) {
    return null;
  }

  const lesson = await db.query.lessons.findFirst({
    where: and(eq(lessons.trackId, track.id), eq(lessons.slug, lessonSlug)),
    with: {
      artifacts: {
        orderBy: (artifact, { asc }) => [asc(artifact.sortOrder)],
      },
    },
  });
  if (!lesson) {
    return null;
  }

  const siblings = await db
    .select({ id: lessons.id, slug: lessons.slug, name: lessons.name })
    .from(lessons)
    .where(eq(lessons.trackId, track.id))
    .orderBy(lessons.sortOrder);
  const index = siblings.findIndex((row) => row.id === lesson.id);

  return {
    ...lesson,
    track,
    position: index + 1,
    previous: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

/** Ids of every lesson the member has completed. Empty for guests. */
export async function listCompletedLessonIds(
  clerkUserId: string | null,
): Promise<Set<string>> {
  if (!clerkUserId) {
    return new Set();
  }
  const rows = await getDb()
    .select({ lessonId: lessonCompletions.lessonId })
    .from(lessonCompletions)
    .where(eq(lessonCompletions.clerkUserId, clerkUserId));
  return new Set(rows.map((row) => row.lessonId));
}

/** Completion dates for the given lessons. Empty for guests. */
export async function listLessonCompletions(
  clerkUserId: string | null,
  lessonIds: string[],
): Promise<Map<string, Date>> {
  if (!clerkUserId || lessonIds.length === 0) {
    return new Map();
  }
  const rows = await getDb()
    .select({
      lessonId: lessonCompletions.lessonId,
      completedAt: lessonCompletions.completedAt,
    })
    .from(lessonCompletions)
    .where(
      and(
        eq(lessonCompletions.clerkUserId, clerkUserId),
        inArray(lessonCompletions.lessonId, lessonIds),
      ),
    );
  return new Map(rows.map((row) => [row.lessonId, row.completedAt]));
}

/** Records a completion. Repeating it keeps the original date. */
export async function completeLesson(
  clerkUserId: string,
  lessonId: string,
): Promise<void> {
  if (!clerkUserId) {
    throw new Error("A signed-in user is required to complete a lesson.");
  }
  await getDb()
    .insert(lessonCompletions)
    .values({ clerkUserId, lessonId })
    .onConflictDoNothing({
      target: [lessonCompletions.clerkUserId, lessonCompletions.lessonId],
    });
}

export async function uncompleteLesson(
  clerkUserId: string,
  lessonId: string,
): Promise<void> {
  if (!clerkUserId) {
    throw new Error("A signed-in user is required to change a lesson.");
  }
  await getDb()
    .delete(lessonCompletions)
    .where(
      and(
        eq(lessonCompletions.clerkUserId, clerkUserId),
        eq(lessonCompletions.lessonId, lessonId),
      ),
    );
}

/** Artifacts for one lesson, in display order. */
export async function listLessonArtifacts(
  lessonId: string,
): Promise<LessonArtifact[]> {
  return getDb()
    .select()
    .from(lessonArtifacts)
    .where(eq(lessonArtifacts.lessonId, lessonId))
    .orderBy(lessonArtifacts.sortOrder);
}
