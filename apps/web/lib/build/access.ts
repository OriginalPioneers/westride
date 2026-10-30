import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { ProjectMemberRole } from "@westride/db";
import { getProject, getProjectRole, type ProjectWithDetails } from "@westride/db/build";
import { revalidatePath } from "next/cache";
import { projectPath } from "./labels";
import { uuidSchema, type FieldErrors } from "./schema";

export type Failure = {
  status: "error";
  message: string;
  fieldErrors: FieldErrors;
  /** Set when the member must connect their Meta account first. */
  needsConnection?: boolean;
};

export function failure(message: string, fieldErrors: FieldErrors = {}): Failure {
  return { status: "error", message, fieldErrors };
}

export function isFailure(value: unknown): value is Failure {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value as Failure).status === "error"
  );
}

export type MemberContext = {
  userId: string;
  project: ProjectWithDetails;
  role: ProjectMemberRole;
};

export async function requireProjectMember(
  projectId: string,
): Promise<MemberContext | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to work on this project.");
  }
  if (!uuidSchema.safeParse(projectId).success) {
    return failure("That project does not exist.");
  }
  const [project, role] = await Promise.all([
    getProject(projectId, { clerkUserId: userId }),
    getProjectRole(projectId, userId),
  ]);
  if (!project || !role) {
    return failure("Only members of this project can change it.");
  }
  return { userId, project, role };
}

export async function requireProjectOwner(
  projectId: string,
): Promise<MemberContext | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (context.role !== "OWNER") {
    return failure("Only an owner can do that.");
  }
  return context;
}

export function revalidateProject(projectId: string) {
  revalidatePath("/build");
  revalidatePath(projectPath(projectId), "layout");
}
