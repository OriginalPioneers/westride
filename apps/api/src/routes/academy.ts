import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
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
import {
  ApiErrorSchema,
  GetAcademyTrackResponseSchema,
  ListAcademyTracksResponseSchema,
  catalogCacheHeaders,
  internalErrorResponse,
  jsonContent,
} from "../schemas";

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

const listTracksRoute = createRoute({
  method: "get",
  path: "/tracks",
  operationId: "listAcademyTracks",
  tags: ["Academy"],
  summary: "List academy tracks",
  description:
    "Returns every WeStride Academy learning track in recommended order, from AI fundamentals to launching a product. Each track includes its difficulty, estimated duration, prerequisites, learning objectives, and the badge earned on completion.",
  responses: {
    200: {
      ...jsonContent(ListAcademyTracksResponseSchema, "The track catalog."),
      headers: catalogCacheHeaders,
    },
    500: internalErrorResponse,
  },
});

const getTrackRoute = createRoute({
  method: "get",
  path: "/tracks/{slug}",
  operationId: "getAcademyTrack",
  tags: ["Academy"],
  summary: "Get an academy track",
  description:
    "Returns one track by slug, with its published lessons and the names of its prerequisite tracks.",
  request: {
    params: z.object({
      slug: z.string().openapi({
        param: { name: "slug", in: "path" },
        description: "Track slug, as returned by List academy tracks.",
        example: "ai-foundations",
      }),
    }),
  },
  responses: {
    200: {
      ...jsonContent(GetAcademyTrackResponseSchema, "The requested track."),
      headers: catalogCacheHeaders,
    },
    404: jsonContent(ApiErrorSchema, "No track has this slug."),
    500: internalErrorResponse,
  },
});

export const academy = new OpenAPIHono();

academy.openapi(listTracksRoute, async (c) => {
  const tracks = await listTracks();
  c.header("Cache-Control", CATALOG_CACHE_CONTROL);
  return c.json(
    { data: tracks.map(toAcademyTrack) } satisfies ListAcademyTracksResponse,
    200,
  );
});

academy.openapi(getTrackRoute, async (c) => {
  const { slug } = c.req.valid("param");
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
  return c.json(
    {
      data: toAcademyTrackDetail(track, prerequisites),
    } satisfies GetAcademyTrackResponse,
    200,
  );
});
