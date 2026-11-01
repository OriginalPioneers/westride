import "server-only";

import { auth } from "@clerk/nextjs/server";
import {
  OPEN_TICKET_STATUSES,
  getAgent,
  getAgentRole,
  type AgentRole,
  type AgentWithDetails,
} from "@westride/db/agents";
import { canRunCode } from "@/lib/agents/start";
import { getMetaConnectionSummary } from "@/lib/meta/connection";
import { hasVercelSandboxAccess } from "@/lib/vercel/connection";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AgentPageContext = {
  agent: AgentWithDetails;
  userId: string | null;
  role: AgentRole | null;
  /** May queue tickets and run jobs. */
  canWork: boolean;
  /** May change settings, schedule, and status. */
  isOwner: boolean;
  /** Whether the viewer has a Meta account connected, so jobs can run on their key. */
  hasMetaConnection: boolean;
  /** Whether the viewer's Vercel account can host sandboxes, so code jobs can run on it. */
  hasVercelConnection: boolean;
  /** Whether jobs for this agent run as Muse Code in its repository. */
  runsCode: boolean;
  openTicketCount: number;
};

/** The agent a page is about, and what the viewer may do with it. */
export async function loadAgentPage(id: string): Promise<AgentPageContext | null> {
  if (!UUID.test(id)) {
    return null;
  }
  const { userId } = await auth();
  const agent = await getAgent(id, { clerkUserId: userId });
  if (!agent) {
    return null;
  }
  const role = await getAgentRole(agent, userId);
  const [hasMetaConnection, hasVercelConnection] =
    role !== null && userId !== null
      ? await Promise.all([
          getMetaConnectionSummary(userId).then((summary) => summary !== null),
          hasVercelSandboxAccess(userId),
        ])
      : [false, false];
  const openTicketCount = OPEN_TICKET_STATUSES.reduce((sum, status) => sum + agent.ticketCounts[status], 0);
  return {
    agent,
    userId,
    role,
    canWork: role !== null,
    isOwner: role === "OWNER",
    hasMetaConnection,
    hasVercelConnection,
    runsCode: canRunCode(agent),
    openTicketCount,
  };
}
