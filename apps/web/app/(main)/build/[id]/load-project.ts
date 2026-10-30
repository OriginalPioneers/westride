import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { ProjectMemberRole } from "@westride/db";
import { getProject, type ProjectWithDetails } from "@westride/db/build";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProjectPageContext = {
  project: ProjectWithDetails;
  userId: string | null;
  role: ProjectMemberRole | null;
  isMember: boolean;
  isOwner: boolean;
};

/** The project a page is about, and what the viewer may do with it. */
export async function loadProjectPage(id: string): Promise<ProjectPageContext | null> {
  if (!UUID.test(id)) {
    return null;
  }
  const { userId } = await auth();
  const project = await getProject(id, { clerkUserId: userId });
  if (!project) {
    return null;
  }
  const role =
    userId === null
      ? null
      : (project.members.find((member) => member.clerkUserId === userId)?.role ?? null);
  return {
    project,
    userId,
    role,
    isMember: role !== null,
    isOwner: role === "OWNER",
  };
}
