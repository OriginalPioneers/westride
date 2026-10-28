import { z } from "@hono/zod-openapi";

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z
        .enum(["not_found", "internal_error"])
        .openapi({ description: "Stable, machine-readable error code." }),
      message: z
        .string()
        .openapi({ description: "Human-readable explanation of the error." }),
    }),
  })
  .openapi("ApiError", {
    description: "Every non-2xx response uses this envelope.",
  });

export const AcademyTrackSchema = z
  .object({
    id: z.string().openapi({
      description: "Stable database identifier.",
      example: "3f6c2a8e-1b2d-4c5e-9f7a-0b1c2d3e4f5a",
    }),
    slug: z.string().openapi({
      description: "URL-safe identifier. Use it to fetch a single track.",
      example: "ai-foundations",
    }),
    name: z.string().openapi({
      example: "AI Foundations: What AI Is and Why It Matters",
    }),
    description: z.string().openapi({
      example:
        "Start your AI journey with a clear, jargon-free introduction to artificial intelligence.",
    }),
    difficulty: z
      .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .openapi({ example: "BEGINNER" }),
    category: z.string().openapi({ example: "Fundamentals" }),
    estimatedDurationMinutes: z.number().int().openapi({ example: 90 }),
    lessonCount: z.number().int().openapi({
      description:
        "Planned lesson count. May exceed the number of published lessons until every lesson is written.",
      example: 8,
    }),
    sortOrder: z.number().int().openapi({
      description: "Position in the recommended learning order, starting at 1.",
      example: 1,
    }),
    icon: z.string().openapi({
      description: 'Lucide icon name, for example "Brain".',
      example: "Brain",
    }),
    tags: z
      .array(z.string())
      .openapi({ example: ["AI Basics", "Fundamentals", "Beginner Friendly"] }),
    prerequisiteSlugs: z.array(z.string()).openapi({
      description: "Slugs of tracks to complete before this one.",
      example: [],
    }),
    learningObjectives: z.array(z.string()).openapi({
      example: [
        "Define artificial intelligence, machine learning, and deep learning in plain language",
      ],
    }),
    achievementTitle: z.string().openapi({
      description: "Badge the learner earns for completing the track.",
      example: "AI Explorer",
    }),
  })
  .openapi("AcademyTrack", {
    description: "A WeStride Academy learning track.",
  });

export const AcademyLessonSchema = z
  .object({
    id: z.string().openapi({ example: "9b1d7c3e-2f4a-4e6b-8c0d-1e2f3a4b5c6d" }),
    name: z.string().openapi({ example: "What Is Artificial Intelligence?" }),
  })
  .openapi("AcademyLesson");

export const AcademyTrackReferenceSchema = z
  .object({
    slug: z.string().openapi({ example: "ai-foundations" }),
    name: z
      .string()
      .openapi({ example: "AI Foundations: What AI Is and Why It Matters" }),
  })
  .openapi("AcademyTrackReference");

export const AcademyTrackDetailSchema = AcademyTrackSchema.extend({
  lessons: z.array(AcademyLessonSchema).openapi({
    description: "Published lessons, in order.",
  }),
  prerequisites: z.array(AcademyTrackReferenceSchema).openapi({
    description: "Resolved `prerequisiteSlugs`, in the same order.",
  }),
}).openapi("AcademyTrackDetail", {
  description: "A track with its lessons and resolved prerequisites.",
});

export const ListAcademyTracksResponseSchema = z.object({
  data: z.array(AcademyTrackSchema),
});

export const GetAcademyTrackResponseSchema = z.object({
  data: AcademyTrackDetailSchema,
});

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
});

export const catalogCacheHeaders = {
  "Cache-Control": {
    description:
      "Responses are cached for 60 seconds in browsers and 5 minutes at the edge.",
    schema: { type: "string" as const, example: "public, max-age=60, s-maxage=300" },
  },
};

export function jsonContent<T extends z.ZodType>(schema: T, description: string) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

export const internalErrorResponse = jsonContent(
  ApiErrorSchema,
  "Unexpected server error.",
);
