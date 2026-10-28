"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createIdea } from "@westride/db/ideas";
import { revalidatePath } from "next/cache";
import {
  createIdeaSchema,
  fieldErrorsFrom,
  type CreateIdeaFailure,
  type CreateIdeaResult,
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

/** Members the founder can add. Requires a signed-in searcher. */
export async function searchIdeaPeople(query: string): Promise<IdeaPersonHit[]> {
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
    return data.filter((user) => user.id !== userId).map(toHit);
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
    revalidatePath("/ideas");
    return { status: "created", id: created.id };
  } catch (error) {
    console.error("Idea create failed", error);
    return failure("The idea could not be saved. Try again.");
  }
}
