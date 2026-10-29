"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createIdea, getIdea, updateIdeaDetails } from "@westride/db/ideas";
import { awardAchievement } from "@westride/db/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createIdeaSchema,
  fieldErrorsFrom,
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

export async function createIdeaFromStudio(
  draft: unknown,
): Promise<CreateIdeaResult> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to create an idea.");
  }

  const parsed = createIdeaSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
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
        return failure("Someone you invited does not have a WeStride account.", {
          invites: "Remove anyone who is not on WeStride, then try again.",
        });
      }
    } catch (error) {
      console.error("Idea invite lookup failed", error);
      return failure("Those invitations could not be checked. Try again.");
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
      tagNames: [],
      // Founder is last so a repeated id cannot replace that role.
      members: [...invites, { clerkUserId: userId, role: "FOUNDER" }],
    });
    await awardAchievement(userId, "first-spark").catch(() => undefined);
    revalidatePath("/achievements");
    revalidatePath("/ideas");
    return { status: "created", id: created.id };
  } catch (error) {
    console.error("Idea create failed", error);
    return failure("The idea could not be saved. Try again.");
  }
}

const ideaIdSchema = z.string().uuid();

const EDIT_ERRORS = new Set([
  "Keep at least one founder.",
  "Only a founder can edit this idea.",
]);

/** A founder updates the name, description, and team. Other fields stay put. */
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
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
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
      description: parsed.data.description,
      members: parsed.data.members,
    });
  } catch (error) {
    console.error("Idea update failed", error);
    const message = error instanceof Error ? error.message : "";
    if (EDIT_ERRORS.has(message)) {
      return failure(message, { members: message });
    }
    return failure("The idea could not be saved. Try again.");
  }

  revalidatePath("/ideas");
  revalidatePath(`/ideas/${ideaId}`);
  const stillMember = parsed.data.members.some(
    (member) => member.clerkUserId === userId,
  );
  return { status: "saved", canStillView: idea.isPublic || stillMember };
}
