import type { lessonArtifactKind } from "../schema";

export type LessonArtifactKindSeed =
  (typeof lessonArtifactKind.enumValues)[number];

/**
 * Media a lesson embeds. Images and diagrams are drawn by Muse Image from
 * the brief and uploaded to the public Blob store by `bun run academy:images`,
 * which writes the resulting `url` back into the catalog; until then `url` is
 * null and the lesson shows a placeholder. Videos link to an existing YouTube
 * video (see `lessonVideo`). Lesson content places an artifact with a line
 * reading `[artifact:<key>]`.
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

/** An existing public YouTube video chosen for a lesson. */
export type LessonYouTubeVideo = {
  /** The video's own title, as published on YouTube. */
  title: string;
  /** The channel that published it. */
  channel: string;
  /** A `https://www.youtube.com/watch?v=…` URL. */
  url: string;
  durationSeconds: number;
  /** What the video covers and why it fits the lesson. */
  brief: string;
};

/** The video every lesson opens with: a curated YouTube video, not one we produce. */
export function lessonVideo(video: LessonYouTubeVideo): LessonArtifactSeed {
  return {
    key: "lesson-video",
    kind: "VIDEO",
    title: video.title,
    brief: `${video.channel} on YouTube. ${video.brief}`,
    url: video.url,
    durationSeconds: video.durationSeconds,
  };
}
