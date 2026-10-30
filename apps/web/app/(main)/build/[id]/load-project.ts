import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { ProjectMemberRole } from "@westride/db";
import {
  OPEN_TICKET_STATUSES,
  getProject,
  type ProjectWithDetails,
} from "@westride/db/build";
import { getMetaConnectionSummary } from "@/lib/meta/connection";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProjectPageContext = {
  project: ProjectWithDetails;
  userId: string | null;
  role: ProjectMemberRole | null;
  isMember: boolean;
  isOwner: boolean;
  /** Whether the viewer has a Meta account connected, so Muse features work. */
  hasMetaConnection: boolean;
  openTicketCount: number;
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
  const hasMetaConnection =
    role !== null && userId !== null
      ? (await getMetaConnectionSummary(userId)) !== null
      : false;
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
    openTicketCount,
  };
}
