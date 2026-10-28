import type {
  AcademyTrack,
  AcademyTrackDetail,
  ApiErrorResponse,
  GetAcademyTrackResponse,
  ListAcademyTracksResponse,
} from "@westride/api-client";
import type { Track } from "@westride/db";
import {
  getTrackWithLessons,
  listTrackNamesBySlug,
  listTracks,
  type TrackWithLessons,
} from "@westride/db/client";
import { Hono } from "hono";

const CATALOG_CACHE_CONTROL = "public, max-age=60, s-maxage=300";

function toAcademyTrack(track: Track): AcademyTrack {
  return {
    id: track.id,
    slug: track.slug,
    name: track.name,
    description: track.description,
    difficulty: track.difficulty,
    category: track.category,
    estimatedDurationMinutes: track.estimatedDurationMinutes,
    lessonCount: track.lessonCount,
    sortOrder: track.sortOrder,
    icon: track.icon,
    tags: track.tags,
    prerequisiteSlugs: track.prerequisiteSlugs,
    learningObjectives: track.learningObjectives,
    achievementTitle: track.achievementTitle,
  };
}

function toAcademyTrackDetail(
  track: TrackWithLessons,
  prerequisites: Pick<Track, "slug" | "name">[],
): AcademyTrackDetail {
  const nameBySlug = new Map(prerequisites.map((p) => [p.slug, p.name]));

  return {
    ...toAcademyTrack(track),
    lessons: track.lessons.map((lesson) => ({
      id: lesson.id,
      name: lesson.name,
    })),
    prerequisites: track.prerequisiteSlugs.map((slug) => ({
      slug,
      name: nameBySlug.get(slug) ?? slug,
    })),
  };
}

export const academy = new Hono();

academy.get("/tracks", async (c) => {
  const tracks = await listTracks();
  c.header("Cache-Control", CATALOG_CACHE_CONTROL);
  return c.json({
    data: tracks.map(toAcademyTrack),
  } satisfies ListAcademyTracksResponse);
});

academy.get("/tracks/:slug", async (c) => {
  const slug = c.req.param("slug");
  const track = await getTrackWithLessons(slug);

  if (!track) {
    return c.json(
      {
        error: { code: "not_found", message: `No track with slug "${slug}".` },
      } satisfies ApiErrorResponse,
      404,
    );
  }

  const prerequisites = await listTrackNamesBySlug(track.prerequisiteSlugs);

  c.header("Cache-Control", CATALOG_CACHE_CONTROL);
  return c.json({
    data: toAcademyTrackDetail(track, prerequisites),
  } satisfies GetAcademyTrackResponse);
});
