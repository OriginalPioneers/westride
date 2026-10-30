import type { lessonArtifactKind } from "../schema";

export type LessonArtifactKindSeed =
  (typeof lessonArtifactKind.enumValues)[number];

/**
 * Media a lesson embeds. Every artifact starts as a placeholder: the brief
 * describes what to generate, and `url` stays null until the asset exists.
 * Lesson content places an artifact with a line reading `[artifact:<key>]`.
 */
export type LessonArtifactSeed = {
  key: string;
  kind: LessonArtifactKindSeed;
  title: string;
  brief: string;
  url?: string | null;
  durationSeconds?: number;
};

export type AcademyLessonSeed = {
  slug: string;
  title: string;
  summary: string;
  estimatedDurationMinutes: number;
  /** Markdown. Headings start at `##`; the lesson title is the page's `h1`. */
  content: string;
  keyTakeaways: string[];
  artifacts: LessonArtifactSeed[];
};

/** Lessons for one track, in order. Keyed by track slug in the catalog. */
export type AcademyTrackLessons = {
  trackSlug: string;
  lessons: AcademyLessonSeed[];
};

/** The narrated lesson video every lesson opens with. */
export function lessonVideo(
  title: string,
  brief: string,
  durationSeconds: number,
): LessonArtifactSeed {
  return { key: "lesson-video", kind: "VIDEO", title, brief, durationSeconds };
}
