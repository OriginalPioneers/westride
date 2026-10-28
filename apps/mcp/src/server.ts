import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WestrideApiError, type WestrideApi } from "@westride/api-client";
import { z } from "zod";

const academyTrackSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  category: z.string(),
  estimatedDurationMinutes: z.number(),
  lessonCount: z.number(),
  sortOrder: z.number(),
  icon: z.string(),
  tags: z.array(z.string()),
  prerequisiteSlugs: z
    .array(z.string())
    .describe("Slugs of tracks to complete before this one."),
  learningObjectives: z.array(z.string()),
  achievementTitle: z
    .string()
    .describe("Badge the learner earns for completing the track."),
});

export function createMcpServer(api: WestrideApi): McpServer {
  const server = new McpServer({ name: "westride", version: "0.1.0" });

  server.registerTool(
    "list_academy_tracks",
    {
      title: "List academy tracks",
      description:
        "List every WeStride Academy learning track in recommended order. Each track includes its difficulty, estimated duration, category, tags, prerequisite track slugs, learning objectives, and the badge earned on completion.",
      outputSchema: { tracks: z.array(academyTrackSchema) },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const tracks = await api.listAcademyTracks();
        return {
          structuredContent: { tracks },
          content: [{ type: "text", text: JSON.stringify({ tracks }) }],
        };
      } catch (error) {
        const message =
          error instanceof WestrideApiError
            ? error.message
            : "Unexpected error while listing academy tracks.";
        console.error(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  return server;
}
