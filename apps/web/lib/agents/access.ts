import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getAgent, getAgentRole, type AgentRole, type AgentWithDetails } from "@westride/db/agents";
import { revalidatePath } from "next/cache";
import { failure, isFailure, type Failure } from "@/lib/build/access";
import { agentPath, agentsPath } from "./labels";
import { uuidSchema } from "./schema";

export { failure, isFailure };
export type { Failure };

export type AgentContext = {
  userId: string;
  agent: AgentWithDetails;
  role: AgentRole;
};

/**
 * Owners manage the agent; collaborators (members of the linked project or
 * idea) work its tickets and run jobs on their own Meta key.
 */
export async function requireAgentCollaborator(agentId: string): Promise<AgentContext | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to work with this agent.");
  }
  if (!uuidSchema.safeParse(agentId).success) {
    return failure("That agent does not exist.");
  }
  const agent = await getAgent(agentId, { clerkUserId: userId });
  if (!agent) {
    return failure("That agent does not exist.");
  }
  const role = await getAgentRole(agent, userId);
  if (!role) {
    return failure("Only the agent's owner and their team can change it.");
  }
  return { userId, agent, role };
}

export async function requireAgentOwner(agentId: string): Promise<AgentContext | Failure> {
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  if (context.role !== "OWNER") {
    return failure("Only the agent's owner can do that.");
  }
  return context;
}

export function revalidateAgent(agentId: string) {
  revalidatePath(agentsPath());
  revalidatePath(agentPath(agentId), "layout");
}
