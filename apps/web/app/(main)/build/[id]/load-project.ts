import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { ProjectMemberRole } from "@westride/db";
import {
  OPEN_TICKET_STATUSES,
  getProject,
  type ProjectWithDetails,
} from "@westride/db/build";
import { isClaimableProject } from "@westride/db/claim-rules";
import { hasMuseAccess, hasSandboxAccess } from "@/lib/cloud/provider";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProjectPageContext = {
  project: ProjectWithDetails;
  userId: string | null;
  role: ProjectMemberRole | null;
  isMember: boolean;
  isOwner: boolean;
  /** Whether Muse can run for the viewer: a Meta account connected, or a funded WeStride Cloud balance. */
  hasMetaConnection: boolean;
  /** Whether a sandbox can start for the viewer: their Vercel or Modal account, or WeStride Cloud. */
  hasComputeAccess: boolean;
  openTicketCount: number;
  /** An imported project that nobody owns yet. */
  isClaimable: boolean;
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
  const [hasMetaConnection, hasComputeAccess] =
    role !== null && userId !== null
      ? await Promise.all([hasMuseAccess(userId), hasSandboxAccess(userId)])
      : [false, false];
  const openTicketCount = OPEN_TICKET_STATUSES.reduce(
    (sum, status) => sum + project.ticketCounts[status],
    0,
  );
  return {
    project,
    userId,
    role,
    isMember: role !== null,
    isOwner: role === "OWNER",
    hasMetaConnection,
    hasComputeAccess,
    openTicketCount,
    isClaimable: isClaimableProject(project),
  };
}
