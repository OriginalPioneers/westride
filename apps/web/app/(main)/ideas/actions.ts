"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { linkIdeaGithubRepo } from "@westride/db/github";
import type { IdeaType } from "@westride/db";
import {
  createIdea,
  followIdea,
  getIdea,
  listCategoryOptions,
  SLUG_INVALID,
  SLUG_TAKEN,
  unfollowIdea,
  updateIdeaDetails,
} from "@westride/db/ideas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isGithubAppConfigured } from "@/lib/github/config";
import { GithubApiError } from "@/lib/github/http";
import {
  ideaDescriptionFromRepo,
  ideaNameFromRepo,
} from "@/lib/github/idea-draft";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import {
  findReadableRepo,
  readRepoReadme,
  type GithubRepo,
} from "@/lib/github/repos";
import { resolveMuseAccess } from "@/lib/cloud/provider";
import { draftIdeaWithMuse, type IdeaDraftSuggestion } from "@/lib/ideas/draft";
import {
  createIdeaSchema,
  fieldErrorsFrom,
  MAX_IDEA_PROMPT,
  updateIdeaSchema,
  type CreateIdeaFailure,
  type CreateIdeaResult,
  type UpdateIdeaResult,
} from "@/lib/ideas/create-schema";

export type IdeaPersonHit = {
  id: string;
  label: string;
  auxiliaryData: {
    imageUrl: string | null;
    detail: string | null;
  };
};

const SEARCH_LIMIT = 8;
const MIN_QUERY = 2;

function failure(
  message: string,
  fieldErrors: CreateIdeaFailure["fieldErrors"] = {},
): CreateIdeaFailure {
  return { status: "error", message, fieldErrors };
}

type ClerkPerson = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  hasImage: boolean;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
};

function personName(user: ClerkPerson): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return (
    name ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    "WeStride member"
  );
}

function personDetail(user: ClerkPerson, name: string): string | null {
  if (user.username && user.username !== name) {
    return `@${user.username}`;
  }
  const email = user.primaryEmailAddress?.emailAddress;
  if (email && email !== name) {
    return email;
  }
  return null;
}

function toHit(user: ClerkPerson): IdeaPersonHit {
  const label = personName(user);
  return {
    id: user.id,
    label,
    auxiliaryData: {
      imageUrl: user.hasImage ? user.imageUrl : null,
      detail: personDetail(user, label),
    },
  };
}

/**
 * Members someone can add to an idea. Requires a signed-in searcher.
 * Creation hides the searcher, who is already the founder. Editing can
 * include them so a founder who removes themself can add themself back.
 */
export async function searchIdeaPeople(
  query: string,
  options?: { includeSelf?: boolean },
): Promise<IdeaPersonHit[]> {
  const { userId } = await auth();
  const trimmed = query.trim();
  if (!userId || trimmed.length < MIN_QUERY) {
    return [];
  }

  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      query: trimmed,
      limit: SEARCH_LIMIT,
    });
    return data
      .filter((user) => options?.includeSelf || user.id !== userId)
      .map(toHit);
  } catch (error) {
    console.error("Idea member search failed", error);
    return [];
  }
}

export type GithubRepoPreview = {
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
};

export type GithubImportResult =
  | {
      status: "imported";
      repo: GithubRepoPreview;
      name: string;
      description: string;
      /** Muse's suggestions. Null and empty when Muse is not available. */
      type: IdeaType | null;
      categories: string[];
    }
  | {
      /** Not connected, and the repo is private or missing. */
      status: "needs-connection";
      message: string;
    }
  | {
      /** Connected, but this repo is not one they granted to WeStride. */
      status: "needs-access";
      message: string;
    }
  | { status: "error"; message: string };

function githubFailureMessage(error: unknown): string {
  if (error instanceof GithubApiError && error.isRateLimited) {
    return "GitHub is limiting requests right now. Try again in a few minutes.";
  }
  return "GitHub could not be reached. Try again.";
}

const ideaTypeSchema = z
  .enum(["BUSINESS", "NON_PROFIT", "GAME", "OPEN_SOURCE", "WEBSITE", "MOBILE_APP"])
  .nullable()
  .catch(null);

async function knownCategoryNames(): Promise<string[]> {
  const options = await listCategoryOptions().catch(() => []);
  return options.map((option) => option.name);
}

/**
 * Reads a repository so the create dialog can fill in the name and the
 * description from its README. When the member can run Muse, it also
 * suggests a kind and categories. Private repositories need the member's
 * own GitHub connection and a grant for that repository.
 */
export async function importIdeaFromGithub(
  url: string,
  preferredType: IdeaType | null = null,
): Promise<GithubImportResult> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in to import from GitHub." };
  }
  const ref = parseGithubRepoRef(url);
  if (!ref) {
    return {
      status: "error",
      message: "Paste a GitHub repository link, like https://github.com/owner/repo.",
    };
  }

  try {
    const access = await findReadableRepo(ref, userId);
    if (access.status === "unavailable") {
      const fullName = `${ref.owner}/${ref.repo}`;
      if (!isGithubAppConfigured()) {
        return {
          status: "error",
          message: `${fullName} is private or does not exist. Only public repositories can be imported right now.`,
        };
      }
      return access.reason === "needs-connection"
        ? {
            status: "needs-connection",
            message: `${fullName} is private, or the link is wrong.`,
          }
        : {
            status: "needs-access",
            message: `WeStride cannot see ${fullName}.`,
          };
    }

    const readme = await readRepoReadme(ref, access.token);
    const name = ideaNameFromRepo(access.repo.name);
    const description = ideaDescriptionFromRepo(access.repo.description, readme);
    const type = ideaTypeSchema.parse(preferredType);
    const suggested = await suggestForRepo(userId, {
      text: `Repository: ${access.repo.fullName}\nName: ${name}\n\n${description}`,
      preferredType: type,
    });
    return {
      status: "imported",
      repo: {
        fullName: access.repo.fullName,
        htmlUrl: access.repo.htmlUrl,
        isPrivate: access.repo.isPrivate,
      },
      name,
      description,
      type: suggested?.type ?? type,
      categories: suggested?.categories ?? [],
    };
  } catch (error) {
    console.error("GitHub import failed", error);
    return { status: "error", message: githubFailureMessage(error) };
  }
}

/** Muse's kind and categories for an imported repo, or null when Muse cannot run. */
async function suggestForRepo(
  userId: string,
  input: { text: string; preferredType: IdeaType | null },
): Promise<IdeaDraftSuggestion | null> {
  const resolved = await resolveMuseAccess(userId).catch(() => null);
  if (!resolved?.ok) {
    return null;
  }
  const outcome = await draftIdeaWithMuse({
    access: resolved.access,
    text: input.text,
    preferredType: input.preferredType,
    knownCategories: await knownCategoryNames(),
  });
  return outcome.ok ? outcome.suggestion : null;
}

export type DraftIdeaResult =
  | { status: "drafted"; suggestion: IdeaDraftSuggestion }
  /** Muse is not connected; the member fills in the details themself. */
  | { status: "needs-ai"; message: string }
  | { status: "error"; message: string };

const draftPromptSchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_IDEA_PROMPT),
  type: ideaTypeSchema,
});

/**
 * Drafts a name, description, kind, and categories from what the member
 * typed in the create dialog. Nothing is saved; the dialog shows the draft
 * for them to edit.
 */
export async function draftIdeaFromPrompt(
  prompt: string,
  type: IdeaType | null,
): Promise<DraftIdeaResult> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in to create an idea." };
  }
  const parsed = draftPromptSchema.safeParse({ prompt, type });
  if (!parsed.success) {
    return {
      status: "error",
      message: `Describe the idea in under ${MAX_IDEA_PROMPT} characters.`,
    };
  }

  const resolved = await resolveMuseAccess(userId).catch(() => null);
  if (!resolved?.ok) {
    return {
      status: "needs-ai",
      message:
        resolved?.message ??
        "Connect your Meta account in Settings, or add funds to WeStride Cloud, to have Muse draft this.",
    };
  }

  const outcome = await draftIdeaWithMuse({
    access: resolved.access,
    text: parsed.data.prompt,
    preferredType: parsed.data.type,
    knownCategories: await knownCategoryNames(),
  });
  if (!outcome.ok) {
    console.error("Idea draft failed", { status: outcome.status, error: outcome.message });
    return { status: "error", message: outcome.message };
  }
  return { status: "drafted", suggestion: outcome.suggestion };
}

export async function createIdeaFromStudio(
  draft: unknown,
): Promise<CreateIdeaResult> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to create an idea.");
  }

  const parsed = createIdeaSchema.safeParse(draft);
  if (!parsed.success) {
    return failure(
      "Fix the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const invites = parsed.data.invites.filter(
    (invite) => invite.clerkUserId !== userId,
  );

  if (invites.length > 0) {
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserList({
        userId: invites.map((invite) => invite.clerkUserId),
        limit: invites.length,
      });
      const known = new Set(data.map((user) => user.id));
      if (invites.some((invite) => !known.has(invite.clerkUserId))) {
        return failure(
          "Someone you invited does not have a WeStride account.",
          {
            invites: "Remove anyone who is not on WeStride, then try again.",
          },
        );
      }
    } catch (error) {
      console.error("Idea invite lookup failed", error);
      return failure("Those invitations could not be checked. Try again.");
    }
  }

  // Checked again here: the browser only sends a link, never repo details.
  let repo: GithubRepo | null = null;
  const repoRef = parseGithubRepoRef(parsed.data.githubRepoUrl);
  if (repoRef) {
    try {
      const access = await findReadableRepo(repoRef, userId);
      if (access.status !== "found") {
        return failure("WeStride can no longer see that GitHub repository.", {
          githubRepoUrl: "Import it again, or remove the link.",
        });
      }
      repo = access.repo;
    } catch (error) {
      console.error("GitHub repo check failed", error);
      return failure(githubFailureMessage(error), {
        githubRepoUrl: "The repository could not be checked.",
      });
    }
  }

  try {
    const created = await createIdea({
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      isFeatured: false,
      isPublic: parsed.data.isPublic,
      countryCodes: [],
      tagNames: parsed.data.categories,
      // Founder is last so a repeated id cannot replace that role.
      members: [...invites, { clerkUserId: userId, role: "FOUNDER" }],
    });
    if (repo) {
      await linkIdeaGithubRepo(created.id, {
        repoId: repo.id,
        owner: repo.owner,
        name: repo.name,
        htmlUrl: repo.htmlUrl,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
        linkedByClerkUserId: userId,
      }).catch((error: unknown) => {
        console.error("Idea GitHub link failed", error);
      });
    }
    revalidatePath("/ideas");
    return { status: "created", id: created.id, slug: created.slug };
  } catch (error) {
    console.error("Idea create failed", error);
    return failure("The idea could not be saved. Try again.");
  }
}

const ideaIdSchema = z.string().uuid();

const EDIT_ERRORS = new Set([
  "Keep at least one founder.",
  "Only a founder can edit this idea.",
  "Add a valid HTTPS prototype link and something to try.",
  "Test your prototype and confirm it works before sharing.",
]);
const SLUG_ERRORS = new Set([SLUG_INVALID, SLUG_TAKEN]);

/** A founder updates the name, description, categories, and team. Other fields stay put. */
export async function updateIdeaFromStudio(
  ideaId: string,
  draft: unknown,
): Promise<UpdateIdeaResult> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to edit this idea.");
  }
  if (!ideaIdSchema.safeParse(ideaId).success) {
    return failure("That idea does not exist.");
  }

  const parsed = updateIdeaSchema.safeParse(draft);
  if (!parsed.success) {
    return failure(
      "Fix the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const idea = await getIdea(ideaId, { clerkUserId: userId });
  if (!idea) {
    return failure("That idea does not exist.");
  }
  const editor = idea.members.find((member) => member.clerkUserId === userId);
  if (editor?.role !== "FOUNDER") {
    return failure("Only a founder can edit this idea.");
  }

  const currentIds = new Set(idea.members.map((member) => member.clerkUserId));
  const additions = parsed.data.members.filter(
    (member) => !currentIds.has(member.clerkUserId),
  );

  if (additions.length > 0) {
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserList({
        userId: additions.map((member) => member.clerkUserId),
        limit: additions.length,
      });
      const known = new Set(data.map((user) => user.id));
      if (additions.some((member) => !known.has(member.clerkUserId))) {
        return failure("Someone you added does not have a WeStride account.", {
          members: "Remove anyone who is not on WeStride, then try again.",
        });
      }
    } catch (error) {
      console.error("Idea member lookup failed", error);
      return failure("Those people could not be checked. Try again.");
    }
  }

  try {
    await updateIdeaDetails(ideaId, userId, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      categoryNames: parsed.data.categories,
      members: parsed.data.members,
      prototypeUrl: parsed.data.prototypeUrl,
      prototypeInstructions: parsed.data.prototypeInstructions,
      prototypeTested: parsed.data.prototypeTested,
    });
  } catch (error) {
    console.error("Idea update failed", error);
    const message = error instanceof Error ? error.message : "";
    if (SLUG_ERRORS.has(message)) {
      return failure(message, { slug: message });
    }
    if (EDIT_ERRORS.has(message)) {
      return failure(message, { members: message });
    }
    return failure("The idea could not be saved. Try again.");
  }

  revalidatePath("/ideas");
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath(`/ideas/${idea.slug}`);
  if (parsed.data.slug !== idea.slug) {
    revalidatePath(`/ideas/${parsed.data.slug}`);
  }
  const stillMember = parsed.data.members.some(
    (member) => member.clerkUserId === userId,
  );
  return {
    status: "saved",
    slug: parsed.data.slug,
    canStillView: idea.isPublic || stillMember,
  };
}

export type FollowResult =
  | { status: "following"; isFollowing: boolean }
  | { status: "error"; message: string };

/**
 * Follows or unfollows an idea for the signed-in member. Following is for
 * ideas you are not on the team of; your own ideas are already under
 * "Your Ideas".
 */
export async function setIdeaFollow(
  ideaId: string,
  isFollowing: boolean,
): Promise<FollowResult> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in to follow ideas." };
  }
  if (!ideaIdSchema.safeParse(ideaId).success) {
    return { status: "error", message: "That idea does not exist." };
  }

  try {
    if (isFollowing) {
      const found = await followIdea(ideaId, userId);
      if (!found) {
        return { status: "error", message: "That idea does not exist." };
      }
    } else {
      await unfollowIdea(ideaId, userId);
    }
  } catch (error) {
    console.error("Idea follow failed", error);
    return {
      status: "error",
      message: isFollowing
        ? "The idea could not be followed. Try again."
        : "The idea could not be unfollowed. Try again.",
    };
  }

  revalidatePath("/ideas");
  revalidatePath(`/ideas/${ideaId}`);
  return { status: "following", isFollowing };
}
