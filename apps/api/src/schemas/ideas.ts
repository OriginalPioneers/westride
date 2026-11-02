import { z } from "@hono/zod-openapi";
import {
  MAX_CATEGORY_NAME,
  MAX_IDEA_CATEGORIES,
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_INVITES,
  MAX_IDEA_MEMBERS,
  MAX_IDEA_NAME,
  MAX_PROTOTYPE_INSTRUCTIONS,
  MAX_PROTOTYPE_URL,
} from "@westride/db/limits";
import {
  ContentOriginSchema,
  GithubRepoLinkSchema,
  PersonSchema,
  nullableText,
  timestamp,
  userId,
  uuid,
} from "./common";

export const IdeaTypeSchema = z
  .enum(["BUSINESS", "NON_PROFIT", "GAME", "OPEN_SOURCE"])
  .openapi("IdeaType");

export const IdeaMemberRoleSchema = z.enum(["FOUNDER", "MEMBER"]).openapi("IdeaMemberRole");

export const IdeaViewSchema = z.enum(["mine", "following", "featured"]).openapi({
  description:
    "A collection: `mine` is the ideas the caller is on the team of, `following` the ones they follow, `featured` the WeStride team's picks. `mine` and `following` need a signed-in caller.",
});

export const IdeaSortSchema = z
  .enum(["newest", "oldest", "updated", "name-asc", "name-desc"])
  .openapi({ description: "Sort order. Defaults to `newest`." });

export const SupportWantSchema = z.enum(["tokens", "compute", "capital"]).openapi({
  description: "Only ideas asking supporters for this kind of help.",
});

export const CategorySchema = z
  .object({
    slug: z.string().openapi({ example: "climate" }),
    name: z.string().openapi({ example: "Climate" }),
  })
  .openapi("Category");

export const CountrySchema = z
  .object({
    code: z.string().openapi({ description: "ISO 3166-1 alpha-2.", example: "KE" }),
    name: z.string().openapi({ example: "Kenya" }),
  })
  .openapi("Country");

export const IdeaMemberSchema = PersonSchema.extend({
  role: IdeaMemberRoleSchema,
}).openapi("IdeaMember");

export const CapitalLinkSchema = z
  .object({
    url: z.string().openapi({ example: "https://opencollective.com/example" }),
    label: z.string().openapi({ description: "Empty when the hostname should show.", example: "Open Collective" }),
  })
  .openapi("CapitalLink");

export const IdeaSchema = z
  .object({
    id: uuid(),
    name: z.string().openapi({ example: "Neighborhood Tool Library" }),
    description: z.string().openapi({ description: "Markdown." }),
    type: IdeaTypeSchema,
    imageUrl: z.string().nullable(),
    isPublic: z.boolean(),
    isFeatured: z.boolean().openapi({ description: "Picked by the WeStride team." }),
    origin: ContentOriginSchema,
    prototypeUrl: z.string().nullable().openapi({ description: "Something people can try." }),
    prototypeInstructions: z.string().nullable(),
    wants: z
      .object({
        tokens: z.boolean(),
        compute: z.boolean(),
        capital: z.boolean(),
      })
      .openapi({ description: "What the team is asking supporters for." }),
    categories: z.array(CategorySchema),
    countries: z.array(CountrySchema).openapi({ description: "Where the idea is for. Empty means anywhere." }),
    members: z.array(IdeaMemberSchema).openapi({ description: "Founders first." }),
    githubRepo: GithubRepoLinkSchema.nullable(),
    capitalLinks: z.array(CapitalLinkSchema),
    followerCount: z.number().int(),
    isFollowing: z.boolean().openapi({ description: "Whether the caller follows it. False for visitors." }),
    viewerRole: IdeaMemberRoleSchema.nullable().openapi({
      description: "The caller's role on the team, or null.",
    }),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  })
  .openapi("Idea");

export const ProjectSummarySchema = z
  .object({
    id: uuid(),
    name: z.string(),
    status: z.enum(["PLANNING", "BUILDING", "LAUNCHED", "PAUSED"]),
    isPublic: z.boolean(),
  })
  .openapi("ProjectSummary");

export const AgentSummarySchema = z
  .object({
    id: uuid(),
    name: z.string(),
    status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
    isPublic: z.boolean(),
  })
  .openapi("AgentSummary");

export const IdeaDetailSchema = IdeaSchema.extend({
  projects: z.array(ProjectSummarySchema).openapi({
    description: "Projects building this idea that the caller may see.",
  }),
  agents: z.array(AgentSummarySchema).openapi({
    description: "Agents linked to this idea that the caller may see.",
  }),
}).openapi("IdeaDetail");

export const ListIdeasQuerySchema = z.object({
  q: z.string().trim().max(200).optional().openapi({
    description: "Matches the name or description, case-insensitively.",
    example: "tool library",
  }),
  type: IdeaTypeSchema.optional(),
  category: z.string().trim().max(MAX_CATEGORY_NAME).optional().openapi({
    description: "A category slug, as returned by GET /v1/ideas/categories.",
  }),
  country: z.string().trim().length(2).optional().openapi({
    description: "ISO 3166-1 alpha-2 country code.",
    example: "KE",
  }),
  view: IdeaViewSchema.optional(),
  wants: SupportWantSchema.optional(),
  sort: IdeaSortSchema.optional(),
});

const nameSchema = z
  .string()
  .trim()
  .min(1, "Give the idea a name.")
  .max(MAX_IDEA_NAME, `Keep the name under ${MAX_IDEA_NAME} characters.`)
  .openapi({ example: "Neighborhood Tool Library" });

const descriptionSchema = z
  .string()
  .trim()
  .min(1, "Describe the idea.")
  .max(MAX_IDEA_DESCRIPTION, `Keep the description under ${MAX_IDEA_DESCRIPTION} characters.`)
  .openapi({ description: "Markdown.", example: "Share rarely used tools with the people next door." });

export const categoryNamesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(MAX_CATEGORY_NAME, `Keep each category under ${MAX_CATEGORY_NAME} characters.`),
  )
  .min(1, "Pick at least one category.")
  .max(MAX_IDEA_CATEGORIES, `Pick up to ${MAX_IDEA_CATEGORIES} categories.`)
  .openapi({
    description: "Category names. Existing names match by slug; new names become new categories.",
    example: ["Community", "Sustainability"],
  });

const ideaInviteSchema = z.object({
  userId: userId(),
  role: IdeaMemberRoleSchema,
});

export const CreateIdeaBodySchema = z
  .object({
    type: IdeaTypeSchema,
    name: nameSchema,
    description: descriptionSchema,
    categories: categoryNamesSchema,
    isPublic: z.boolean().openapi({ description: "Public ideas are visible to everyone; private ones to the team." }),
    invites: z
      .array(ideaInviteSchema)
      .max(MAX_IDEA_INVITES, `Invite up to ${MAX_IDEA_INVITES} people.`)
      .default([])
      .openapi({ description: "People to add besides you. You become a founder." }),
  })
  .openapi("CreateIdeaBody");

export const UpdateIdeaBodySchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    categories: categoryNamesSchema.optional(),
    prototypeUrl: nullableText(MAX_PROTOTYPE_URL).optional().openapi({
      description: "A full HTTPS link people can try. Null clears it.",
    }),
    prototypeInstructions: nullableText(MAX_PROTOTYPE_INSTRUCTIONS).optional().openapi({
      description: "One thing to try at the prototype link. Required when there is a link.",
    }),
    prototypeTested: z.boolean().optional().openapi({
      description: "Confirm you tested the prototype. Required when the prototype changes.",
    }),
    members: z
      .array(ideaInviteSchema)
      .max(MAX_IDEA_MEMBERS, `An idea can have up to ${MAX_IDEA_MEMBERS} people.`)
      .optional()
      .openapi({ description: "The whole team after the change. Keep at least one founder." }),
  })
  .openapi("UpdateIdeaBody", {
    description: "Every field is optional; omitted fields keep their value. Only founders may edit.",
  });

export const FollowStateSchema = z.object({
  isFollowing: z.boolean(),
  followerCount: z.number().int(),
});

export const ideaIdParam = z.object({
  id: uuid().openapi({ param: { name: "id", in: "path" }, description: "Idea id." }),
});

export const ListIdeasResponseSchema = z.object({ data: z.array(IdeaSchema) });
export const IdeaResponseSchema = z.object({ data: IdeaDetailSchema });
export const CategoriesResponseSchema = z.object({ data: z.array(CategorySchema) });
export const FollowResponseSchema = z.object({ data: FollowStateSchema });
