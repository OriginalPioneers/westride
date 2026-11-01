import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { EntityImageKind } from "@westride/db/entity-images";
import { getIdea } from "@westride/db/ideas";
import { revalidatePath } from "next/cache";
import { requireAgentOwner, revalidateAgent } from "@/lib/agents/access";
import { failure, isFailure, requireProjectOwner, revalidateProject, type Failure } from "@/lib/build/access";
import { uuidSchema } from "@/lib/build/schema";
import { ideaPath } from "@/lib/ideas/filters";

export type ImageEditorContext = {
  userId: string;
  kind: EntityImageKind;
  id: string;
  name: string;
  /** Markdown. */
  description: string;
};

/**
 * The same people who may edit the entity's details may change its image:
 * an idea's founders, a project's owners, and an agent's owner.
 */
export async function requireImageEditor(
  kind: EntityImageKind,
  id: string,
): Promise<ImageEditorContext | Failure> {
  if (kind === "project") {
    const context = await requireProjectOwner(id);
    if (isFailure(context)) {
      return context;
    }
    const { project, userId } = context;
    return { userId, kind, id, name: project.name, description: project.description };
  }
  if (kind === "agent") {
    const context = await requireAgentOwner(id);
    if (isFailure(context)) {
      return context;
    }
    const { agent, userId } = context;
    return { userId, kind, id, name: agent.name, description: agent.description };
  }

  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to change this idea.");
  }
  if (!uuidSchema.safeParse(id).success) {
    return failure("That idea does not exist.");
  }
  const idea = await getIdea(id, { clerkUserId: userId });
  if (!idea) {
    return failure("That idea does not exist.");
  }
  const editor = idea.members.find((member) => member.clerkUserId === userId);
  if (editor?.role !== "FOUNDER") {
    return failure("Only a founder can change this idea's image.");
  }
  return { userId, kind, id, name: idea.name, description: idea.description };
}

export function revalidateEntity(kind: EntityImageKind, id: string) {
  if (kind === "project") {
    revalidateProject(id);
  } else if (kind === "agent") {
    revalidateAgent(id);
  } else {
    revalidatePath("/ideas");
    revalidatePath(ideaPath(id));
  }
}
