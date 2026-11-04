import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { listAgentsForIdea } from "@westride/db/agents";
import { listProjectsForIdea } from "@westride/db/build";
import {
  createIdea,
  followIdea,
  getIdea,
  listCategoryOptions,
  listIdeas,
  unfollowIdea,
  updateIdeaDetails,
  type IdeaWithDetails,
} from "@westride/db/ideas";
import type { Context } from "hono";
import { signInRequired, viewerOf } from "../auth";
import {
  forbidden,
  notFound,
  onValidationError,
  validationFailed,
} from "../errors";
import { unknownPeople } from "../people";
import {
  bearerSecurity,
  internalErrorResponse,
  jsonContent,
  readErrorResponses,
  unauthorizedResponse,
  writeErrorResponses,
} from "../schemas/common";
import {
  CategoriesResponseSchema,
  CreateIdeaBodySchema,
  FollowResponseSchema,
  IdeaResponseSchema,
  ListIdeasQuerySchema,
  ListIdeasResponseSchema,
  UpdateIdeaBodySchema,
  ideaIdParam,
} from "../schemas/ideas";
import { toIdeaDetail, toIdeas } from "../serialize/ideas";

const TAG = "Ideas";

const EDIT_RULES = new Set([
  "Keep at least one founder.",
  "Only a founder can edit this idea.",
  "Add a valid HTTPS prototype link and something to try.",
  "Test your prototype and confirm it works before sharing.",
]);

async function ideaDetail(c: Context, idea: IdeaWithDetails) {
  const viewer = viewerOf(c);
  const [projects, agents] = await Promise.all([
    listProjectsForIdea(idea.id, viewer),
    listAgentsForIdea(idea.id, viewer),
  ]);
  return toIdeaDetail(idea, projects, agents, viewer.clerkUserId);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const listRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "listIdeas",
  tags: [TAG],
  summary: "List ideas",
  description:
    "Ideas the caller may see: every public idea, plus private ideas the caller is on the team of when a token is sent. Filter by text, type, category, country, collection, or the kind of support an idea wants.",
  security: bearerSecurity,
  request: { query: ListIdeasQuerySchema },
  responses: {
    200: jsonContent(ListIdeasResponseSchema, "Matching ideas."),
    401: unauthorizedResponse,
    500: internalErrorResponse,
  },
});

const categoriesRoute = createRoute({
  method: "get",
  path: "/categories",
  operationId: "listIdeaCategories",
  tags: [TAG],
  summary: "List idea categories",
  description: "Every category an idea can carry, with the slug to filter by.",
  responses: {
    200: jsonContent(CategoriesResponseSchema, "Categories, alphabetically."),
    500: internalErrorResponse,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  operationId: "getIdea",
  tags: [TAG],
  summary: "Get an idea",
  description:
    "One idea with its team, categories, countries, repository, capital links, and the projects and agents linked to it that the caller may see.",
  security: bearerSecurity,
  request: { params: ideaIdParam },
  responses: {
    200: jsonContent(IdeaResponseSchema, "The idea."),
    ...readErrorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  operationId: "createIdea",
  tags: [TAG],
  summary: "Create an idea",
  description:
    "Creates an idea with the caller as its founder. Invite teammates by member id; everyone invited must already have a WeStride account.",
  security: bearerSecurity,
  request: { body: jsonContent(CreateIdeaBodySchema, "The new idea.") },
  responses: {
    201: jsonContent(IdeaResponseSchema, "The idea as created."),
    ...writeErrorResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/{id}",
  operationId: "updateIdea",
  tags: [TAG],
  summary: "Update an idea",
  description:
    "Changes an idea's name, description, categories, prototype, or team. Only a founder may edit. Omitted fields keep their value.",
  security: bearerSecurity,
  request: {
    params: ideaIdParam,
    body: jsonContent(UpdateIdeaBodySchema, "The fields to change."),
  },
  responses: {
    200: jsonContent(IdeaResponseSchema, "The idea after the change."),
    ...writeErrorResponses,
  },
});

const followRoute = createRoute({
  method: "put",
  path: "/{id}/follow",
  operationId: "followIdea",
  tags: [TAG],
  summary: "Follow an idea",
  description:
    "Follows an idea so it appears in the caller's `following` collection. Following your own idea is a no-op.",
  security: bearerSecurity,
  request: { params: ideaIdParam },
  responses: {
    200: jsonContent(FollowResponseSchema, "The follow state after the change."),
    401: unauthorizedResponse,
    404: readErrorResponses[404],
    500: internalErrorResponse,
  },
});

const unfollowRoute = createRoute({
  method: "delete",
  path: "/{id}/follow",
  operationId: "unfollowIdea",
  tags: [TAG],
  summary: "Unfollow an idea",
  security: bearerSecurity,
  request: { params: ideaIdParam },
  responses: {
    200: jsonContent(FollowResponseSchema, "The follow state after the change."),
    401: unauthorizedResponse,
    404: readErrorResponses[404],
    500: internalErrorResponse,
  },
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const ideas = new OpenAPIHono({ defaultHook: onValidationError });

ideas.openapi(listRoute, async (c) => {
  const query = c.req.valid("query");
  const viewer = viewerOf(c);
  const rows = await listIdeas(
    {
      query: query.q,
      type: query.type,
      tagSlug: query.category,
      countryCode: query.country?.toUpperCase(),
      view: query.view,
      wants: query.wants,
      sort: query.sort,
    },
    viewer,
  );
  return c.json({ data: await toIdeas(rows, viewer.clerkUserId) }, 200);
});

ideas.openapi(categoriesRoute, async (c) => {
  const categories = await listCategoryOptions();
  c.header("Cache-Control", "public, max-age=60, s-maxage=300");
  return c.json({ data: categories }, 200);
});

ideas.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const idea = await getIdea(id, viewerOf(c));
  if (!idea) {
    return notFound(c, "That idea");
  }
  return c.json({ data: await ideaDetail(c, idea) }, 200);
});

ideas.openapi(createRoute_, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const body = c.req.valid("json");
  const invites = body.invites.filter((invite) => invite.userId !== caller.userId);
  const unknown = await unknownPeople(invites.map((invite) => invite.userId));
  if (unknown.length > 0) {
    return validationFailed(c, "Someone you invited does not have a WeStride account.", {
      invites: `No member has the id ${unknown.join(", ")}.`,
    });
  }

  const created = await createIdea({
    name: body.name,
    description: body.description,
    type: body.type,
    isFeatured: false,
    isPublic: body.isPublic,
    countryCodes: [],
    tagNames: body.categories,
    // Founder is last so a repeated id cannot replace that role.
    members: [
      ...invites.map((invite) => ({ clerkUserId: invite.userId, role: invite.role })),
      { clerkUserId: caller.userId, role: "FOUNDER" as const },
    ],
  });

  const idea = await getIdea(created.id, viewerOf(c));
  if (!idea) {
    return notFound(c, "The new idea");
  }
  return c.json({ data: await ideaDetail(c, idea) }, 201);
});

ideas.openapi(updateRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const idea = await getIdea(id, viewerOf(c));
  if (!idea) {
    return notFound(c, "That idea");
  }
  const editor = idea.members.find((member) => member.clerkUserId === caller.userId);
  if (editor?.role !== "FOUNDER") {
    return forbidden(c, "Only a founder can edit this idea.");
  }

  const members = body.members
    ? body.members.map((member) => ({ clerkUserId: member.userId, role: member.role }))
    : idea.members.map((member) => ({ clerkUserId: member.clerkUserId, role: member.role }));
  if (!members.some((member) => member.role === "FOUNDER")) {
    return validationFailed(c, "Keep at least one founder.", {
      members: "Keep at least one founder.",
    });
  }
  const current = new Set(idea.members.map((member) => member.clerkUserId));
  const unknown = await unknownPeople(
    members.map((member) => member.clerkUserId).filter((userId) => !current.has(userId)),
  );
  if (unknown.length > 0) {
    return validationFailed(c, "Someone you added does not have a WeStride account.", {
      members: `No member has the id ${unknown.join(", ")}.`,
    });
  }

  const prototypeUrl =
    body.prototypeUrl === undefined ? (idea.prototypeUrl ?? "") : (body.prototypeUrl ?? "");
  const prototypeInstructions =
    body.prototypeInstructions === undefined
      ? (idea.prototypeInstructions ?? "")
      : (body.prototypeInstructions ?? "");

  try {
    await updateIdeaDetails(id, caller.userId, {
      name: body.name ?? idea.name,
      description: body.description ?? idea.description,
      categoryNames: body.categories ?? idea.tags.map((tag) => tag.name),
      members,
      prototypeUrl,
      prototypeInstructions,
      prototypeTested: body.prototypeTested ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (EDIT_RULES.has(message)) {
      return validationFailed(c, message);
    }
    throw error;
  }

  const updated = await getIdea(id, viewerOf(c));
  if (!updated) {
    // The editor left a private idea; it is no longer theirs to read.
    return notFound(c, "That idea");
  }
  return c.json({ data: await ideaDetail(c, updated) }, 200);
});

ideas.openapi(followRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const found = await followIdea(id, caller.userId);
  if (!found) {
    return notFound(c, "That idea");
  }
  const idea = await getIdea(id, viewerOf(c));
  return c.json(
    { data: { isFollowing: idea?.isFollowing ?? true, followerCount: idea?.followerCount ?? 0 } },
    200,
  );
});

ideas.openapi(unfollowRoute, async (c) => {
  const caller = c.get("caller");
  if (!caller) {
    return signInRequired(c);
  }
  const { id } = c.req.valid("param");
  const idea = await getIdea(id, viewerOf(c));
  if (!idea) {
    return notFound(c, "That idea");
  }
  await unfollowIdea(id, caller.userId);
  return c.json(
    { data: { isFollowing: false, followerCount: Math.max(0, idea.followerCount - (idea.isFollowing ? 1 : 0)) } },
    200,
  );
});
