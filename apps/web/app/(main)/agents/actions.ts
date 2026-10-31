"use server";

import { auth } from "@clerk/nextjs/server";
import {
  addAgentLog,
  createAgent,
  createAgentTicket,
  deleteAgent,
  describeSchedule,
  listAgentLinkOptions,
  setAgentStatus,
  updateAgentDetails,
  updateAgentRepo,
  updateAgentSchedule,
  type AgentRepoInput,
} from "@westride/db/agents";
import {
  failure,
  isFailure,
  requireAgentOwner,
  revalidateAgent,
  type Failure,
} from "@/lib/agents/access";
import { agentsPath } from "@/lib/agents/labels";
import {
  agentDetailsSchema,
  agentRepoSchema,
  agentScheduleSchema,
  agentStatusSchema,
  createAgentSchema,
  fieldErrorsFrom,
} from "@/lib/agents/schema";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { findReadableRepo } from "@/lib/github/repos";
import { isMuseModelId } from "@/lib/idea-factory/pricing";
import { revalidatePath } from "next/cache";

type Ok = { status: "ok" };

/** The links an agent may carry: only ideas and projects the member belongs to. */
async function checkLinks(
  userId: string,
  ideaId: string | null,
  projectId: string | null,
): Promise<Failure | null> {
  if (!ideaId && !projectId) {
    return null;
  }
  const options = await listAgentLinkOptions(userId);
  if (ideaId && !options.ideas.some((idea) => idea.id === ideaId)) {
    return failure("Pick an idea you are a member of.", { ideaId: "Pick an idea you are a member of." });
  }
  if (projectId && !options.projects.some((project) => project.id === projectId)) {
    return failure("Pick a project you are a member of.", {
      projectId: "Pick a project you are a member of.",
    });
  }
  return null;
}

/** Resolves a GitHub URL to the repository facts an agent stores. */
async function resolveRepo(
  userId: string,
  url: string,
): Promise<{ repo: AgentRepoInput } | Failure> {
  const ref = parseGithubRepoRef(url);
  if (!ref) {
    return failure("Use a GitHub repository link.", {
      githubRepoUrl: "Use a GitHub repository link, like https://github.com/owner/repo.",
    });
  }
  const access = await findReadableRepo(ref, userId);
  if (access.status !== "found") {
    const message =
      access.reason === "needs-connection"
        ? "Connect GitHub in Settings to link a private repository."
        : "Grant WeStride access to this repository on GitHub first.";
    return failure(message, { githubRepoUrl: message });
  }
  if (access.repo.isArchived) {
    return failure("This repository is archived on GitHub.", {
      githubRepoUrl: "This repository is archived on GitHub.",
    });
  }
  return {
    repo: {
      repoId: access.repo.id,
      owner: access.repo.owner,
      name: access.repo.name,
      htmlUrl: access.repo.htmlUrl,
      defaultBranch: access.repo.defaultBranch,
      isPrivate: access.repo.isPrivate,
    },
  };
}

export type CreateAgentResult = { status: "ok"; agentId: string } | Failure;

export async function createAgentAction(input: unknown): Promise<CreateAgentResult> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to create an agent.");
  }
  const parsed = createAgentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const data = parsed.data;
  if (!isMuseModelId(data.model)) {
    return failure("Choose a supported Muse model.", { model: "Choose a supported Muse model." });
  }
  const linkError = await checkLinks(userId, data.ideaId, data.projectId);
  if (linkError) {
    return linkError;
  }
  let repo: AgentRepoInput | null = null;
  if (data.githubRepoUrl) {
    const resolved = await resolveRepo(userId, data.githubRepoUrl);
    if (isFailure(resolved)) {
      return resolved;
    }
    repo = resolved.repo;
  }

  try {
    const { id } = await createAgent(userId, {
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      isPublic: data.isPublic,
      ideaId: data.ideaId,
      projectId: data.projectId,
      model: data.model,
      maxSteps: data.maxSteps,
      repo,
      schedule: data.schedule,
      scheduleHourUtc: data.scheduleHourUtc,
      scheduleWeekday: data.scheduleWeekday,
      standingTask: data.standingTask,
    });
    await addAgentLog(id, { kind: "agent", message: `Created ${data.name}.`, actorClerkUserId: userId });
    if (data.schedule !== "NONE") {
      await addAgentLog(id, {
        kind: "schedule",
        message: `Schedule set: ${describeSchedule(data)}.`,
        actorClerkUserId: userId,
      });
    }
    if (data.firstTicket) {
      const ticket = await createAgentTicket(id, {
        title: data.firstTicket,
        description: "",
        priority: "MEDIUM",
        createdByClerkUserId: userId,
      });
      await addAgentLog(id, {
        kind: "ticket",
        message: `Queued ticket #${ticket.number}: ${ticket.title}.`,
        ticketId: ticket.id,
        actorClerkUserId: userId,
      });
    }
    revalidatePath(agentsPath());
    return { status: "ok", agentId: id };
  } catch (error) {
    console.error("Agent create failed", error);
    return failure("The agent could not be created. Try again.");
  }
}

export async function updateAgentDetailsAction(agentId: string, input: unknown): Promise<Ok | Failure> {
  const context = await requireAgentOwner(agentId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = agentDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const data = parsed.data;
  if (!isMuseModelId(data.model)) {
    return failure("Choose a supported Muse model.", { model: "Choose a supported Muse model." });
  }
  const linkError = await checkLinks(context.userId, data.ideaId, data.projectId);
  if (linkError) {
    return linkError;
  }
  try {
    await updateAgentDetails(agentId, data);
    await addAgentLog(agentId, {
      kind: "settings",
      message: "Updated the agent's details.",
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent update failed", error);
    return failure("The agent could not be saved. Try again.");
  }
}

export async function updateAgentRepoAction(agentId: string, input: unknown): Promise<Ok | Failure> {
  const context = await requireAgentOwner(agentId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = agentRepoSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the repository link.", fieldErrorsFrom(parsed.error));
  }
  try {
    if (!parsed.data.githubRepoUrl) {
      await updateAgentRepo(agentId, null);
      await addAgentLog(agentId, {
        kind: "settings",
        message: "Unlinked the repository.",
        actorClerkUserId: context.userId,
      });
    } else {
      const resolved = await resolveRepo(context.userId, parsed.data.githubRepoUrl);
      if (isFailure(resolved)) {
        return resolved;
      }
      await updateAgentRepo(agentId, resolved.repo);
      await addAgentLog(agentId, {
        kind: "settings",
        message: `Linked ${resolved.repo.owner}/${resolved.repo.name}.`,
        actorClerkUserId: context.userId,
      });
    }
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent repo update failed", error);
    return failure("The repository could not be linked. Try again.");
  }
}

export async function updateAgentScheduleAction(agentId: string, input: unknown): Promise<Ok | Failure> {
  const context = await requireAgentOwner(agentId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = agentScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the schedule.", fieldErrorsFrom(parsed.error));
  }
  try {
    await updateAgentSchedule(agentId, context.agent.status, parsed.data);
    await addAgentLog(agentId, {
      kind: "schedule",
      message:
        parsed.data.schedule === "NONE"
          ? "Schedule cleared."
          : `Schedule set: ${describeSchedule(parsed.data)}.`,
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent schedule update failed", error);
    return failure("The schedule could not be saved. Try again.");
  }
}

export async function setAgentStatusAction(agentId: string, input: unknown): Promise<Ok | Failure> {
  const context = await requireAgentOwner(agentId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = agentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Choose a status.", fieldErrorsFrom(parsed.error));
  }
  if (parsed.data.status === context.agent.status) {
    return { status: "ok" };
  }
  try {
    await setAgentStatus(context.agent, parsed.data.status);
    const verb =
      parsed.data.status === "ACTIVE"
        ? "Resumed"
        : parsed.data.status === "PAUSED"
          ? "Paused"
          : "Archived";
    await addAgentLog(agentId, {
      kind: "agent",
      message: `${verb} the agent.`,
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent status change failed", error);
    return failure("The status could not be changed. Try again.");
  }
}

export async function deleteAgentAction(agentId: string): Promise<Ok | Failure> {
  const context = await requireAgentOwner(agentId);
  if (isFailure(context)) {
    return context;
  }
  if (context.agent.activeJobs > 0) {
    return failure("Stop the running job before deleting the agent.");
  }
  try {
    await deleteAgent(agentId);
    revalidatePath(agentsPath());
    return { status: "ok" };
  } catch (error) {
    console.error("Agent delete failed", error);
    return failure("The agent could not be deleted. Try again.");
  }
}