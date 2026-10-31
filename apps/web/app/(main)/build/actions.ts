"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import type { ProjectMemberRole, ProjectMilestone, ProjectRepo } from "@westride/db";
import {
  createMilestone,
  createProject,
  createTicket,
  deleteMilestone,
  deleteTicket,
  linkProjectRepo,
  moveTicket,
  reorderTicket,
  setPrimaryProjectRepo,
  unlinkProjectRepo,
  updateMilestone,
  updateProjectDetails,
  updateTicket,
  type ProjectWithDetails,
  type TicketWithDetails,
} from "@westride/db/build";
import { getIdea } from "@westride/db/ideas";
import { revalidatePath } from "next/cache";
import {
  failure,
  isFailure,
  requireProjectMember,
  requireProjectOwner,
  revalidateProject,
  type Failure,
} from "@/lib/build/access";
import {
  createProjectSchema,
  fieldErrorsFrom,
  type CreateProjectInput,
  milestoneSchema,
  moveTicketSchema,
  reorderTicketSchema,
  ticketSchema,
  updateProjectSchema,
  uuidSchema,
} from "@/lib/build/schema";
import { ticketPath, ticketsPath } from "@/lib/build/labels";
import { isGithubAppConfigured } from "@/lib/github/config";
import { GithubApiError } from "@/lib/github/http";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import {
  createGithubRepo,
  findReadableRepo,
  GithubWriteError,
  listGithubRepoOwners,
  type GithubRepo,
  type GithubRepoOwner,
} from "@/lib/github/repos";
import { resolveMemberProfiles, type MemberProfile } from "@/lib/ideas/members";

export type { Failure } from "@/lib/build/access";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Confirms every invited account exists. */
async function checkAccounts(
  clerkUserIds: string[],
  fieldKey: string,
): Promise<Failure | null> {
  if (clerkUserIds.length === 0) {
    return null;
  }
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      userId: clerkUserIds,
      limit: clerkUserIds.length,
    });
    const known = new Set(data.map((user) => user.id));
    if (clerkUserIds.some((id) => !known.has(id))) {
      return failure("Someone you added does not have a WeStride account.", {
        [fieldKey]: "Remove anyone who is not on WeStride, then try again.",
      });
    }
    return null;
  } catch (error) {
    console.error("Project member lookup failed", error);
    return failure("Those people could not be checked. Try again.");
  }
}

function githubFailureMessage(error: unknown): string {
  if (error instanceof GithubApiError && error.isRateLimited) {
    return "GitHub is limiting requests right now. Try again in a few minutes.";
  }
  return "GitHub could not be reached. Try again.";
}

type RepoLookup =
  | { status: "found"; repo: GithubRepo }
  | { status: "error"; message: string };

/** Reads a repository the member may see. Private repos need their GitHub connection. */
async function lookupRepo(url: string, userId: string): Promise<RepoLookup> {
  const ref = parseGithubRepoRef(url);
  if (!ref) {
    return {
      status: "error",
      message: "Use a GitHub repository link, like https://github.com/owner/repo.",
    };
  }
  try {
    const access = await findReadableRepo(ref, userId);
    if (access.status === "found") {
      return { status: "found", repo: access.repo };
    }
    const fullName = `${ref.owner}/${ref.repo}`;
    if (!isGithubAppConfigured()) {
      return {
        status: "error",
        message: `${fullName} is private or does not exist. Only public repositories can be linked right now.`,
      };
    }
    return {
      status: "error",
      message:
        access.reason === "needs-connection"
          ? `${fullName} is private, or the link is wrong. Connect GitHub in Settings to link private repositories.`
          : `WeStride cannot see ${fullName}. Grant it access on GitHub, then try again.`,
    };
  } catch (error) {
    console.error("GitHub repo lookup failed", error);
    return { status: "error", message: githubFailureMessage(error) };
  }
}

const NEW_REPO_NAME_FIELD = "newGithubRepo.name";
const NEW_REPO_OWNER_FIELD = "newGithubRepo.owner";

/** Creates the repository as the member. GitHub decides where they may create. */
async function createRepoForProject(
  spec: NonNullable<CreateProjectInput["newGithubRepo"]>,
  userId: string,
): Promise<{ status: "created"; repo: GithubRepo } | Failure> {
  if (!isGithubAppConfigured()) {
    return failure("GitHub is not set up on WeStride, so repositories cannot be created here.");
  }
  try {
    const owners = await listGithubRepoOwners(userId);
    if (!owners) {
      const message = "Connect GitHub in Settings to create a repository.";
      return failure(message, { [NEW_REPO_OWNER_FIELD]: message });
    }
    const owner = owners.find(
      (candidate) => candidate.login.toLowerCase() === spec.owner.toLowerCase(),
    );
    if (!owner) {
      const message = `WeStride is not installed on ${spec.owner}. Add it on GitHub, then try again.`;
      return failure(message, { [NEW_REPO_OWNER_FIELD]: message });
    }
    const repo = await createGithubRepo(userId, {
      organization: owner.isOrganization ? owner.login : undefined,
      name: spec.name,
      isPrivate: spec.isPrivate,
    });
    return { status: "created", repo };
  } catch (error) {
    if (error instanceof GithubWriteError) {
      return failure(error.message, { [NEW_REPO_NAME_FIELD]: error.message });
    }
    console.error("GitHub repo create failed", error);
    return failure(githubFailureMessage(error));
  }
}

function toRepoInput(repo: GithubRepo, userId: string) {
  return {
    repoId: repo.id,
    owner: repo.owner,
    name: repo.name,
    htmlUrl: repo.htmlUrl,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    linkedByClerkUserId: userId,
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectPrefill = {
  ideaId: string;
  name: string;
  description: string;
  /** The idea's team, minus the viewer, who becomes the owner. */
  invites: (MemberProfile & { role: ProjectMemberRole })[];
  githubRepoUrl: string | null;
};

/** What "Build this idea" starts the new-project dialog with. */
export async function loadProjectPrefill(
  ideaId: string,
): Promise<{ status: "ok"; prefill: ProjectPrefill } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to start a project.");
  }
  if (!uuidSchema.safeParse(ideaId).success) {
    return failure("That idea does not exist.");
  }
  const idea = await getIdea(ideaId, { clerkUserId: userId });
  if (!idea || !idea.members.some((member) => member.clerkUserId === userId)) {
    return failure("Only members of an idea can start a project from it.");
  }
  const others = idea.members.filter((member) => member.clerkUserId !== userId);
  const profiles = await resolveMemberProfiles(others.map((member) => member.clerkUserId));
  return {
    status: "ok",
    prefill: {
      ideaId: idea.id,
      name: idea.name,
      description: idea.description,
      invites: others.map((member) => ({
        ...(profiles.get(member.clerkUserId) ?? {
          clerkUserId: member.clerkUserId,
          name: "WeStride member",
          imageUrl: null,
        }),
        role: member.role === "FOUNDER" ? "OWNER" : "MEMBER",
      })),
      githubRepoUrl: idea.githubRepo?.htmlUrl ?? null,
    },
  };
}

export type GithubRepoOwnersResult =
  | { status: "ok"; owners: GithubRepoOwner[] }
  | { status: "needs-connection" }
  | { status: "unavailable" }
  | Failure;

/** Where the new-project dialog can create a repository for the member. */
export async function loadGithubRepoOwners(): Promise<GithubRepoOwnersResult> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to create a repository.");
  }
  if (!isGithubAppConfigured()) {
    return { status: "unavailable" };
  }
  try {
    const owners = await listGithubRepoOwners(userId);
    return owners ? { status: "ok", owners } : { status: "needs-connection" };
  } catch (error) {
    console.error("GitHub owner lookup failed", error);
    return failure(githubFailureMessage(error));
  }
}

export type CreateProjectResult =
  | { status: "created"; id: string }
  | (Failure & {
      /** Set when the repository was created but the project was not, so a retry links it. */
      createdRepoUrl?: string;
    });

export async function createProjectFromStudio(draft: unknown): Promise<CreateProjectResult> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in to create a project.");
  }
  const parsed = createProjectSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const input = parsed.data;

  let ideaId: string | null = null;
  if (input.ideaId) {
    const idea = await getIdea(input.ideaId, { clerkUserId: userId });
    if (!idea || !idea.members.some((member) => member.clerkUserId === userId)) {
      return failure("Only members of an idea can start a project from it.", {
        ideaId: "Pick an idea you belong to, or start without one.",
      });
    }
    ideaId = idea.id;
  }

  const invites = input.invites.filter((invite) => invite.clerkUserId !== userId);
  const accountsProblem = await checkAccounts(
    invites.map((invite) => invite.clerkUserId),
    "invites",
  );
  if (accountsProblem) {
    return accountsProblem;
  }

  // Checked here: the browser only sends links, never repository details.
  const repos: GithubRepo[] = [];
  for (const url of input.githubRepoUrls.filter(Boolean)) {
    const lookup = await lookupRepo(url, userId);
    if (lookup.status === "error") {
      return failure(lookup.message, { githubRepoUrls: lookup.message });
    }
    if (!repos.some((repo) => repo.id === lookup.repo.id)) {
      repos.push(lookup.repo);
    }
  }

  // Last, so nothing else can still fail after it exists on GitHub.
  let newRepo: GithubRepo | null = null;
  if (input.newGithubRepo) {
    const creation = await createRepoForProject(input.newGithubRepo, userId);
    if (creation.status === "error") {
      return creation;
    }
    newRepo = creation.repo;
    // First linked is primary.
    repos.unshift(newRepo);
  }

  try {
    const created = await createProject({
      name: input.name,
      description: input.description,
      isPublic: input.isPublic,
      ideaId,
      // Owner is last so a repeated id cannot replace that role.
      members: [...invites, { clerkUserId: userId, role: "OWNER" }],
    });
    for (const repo of repos) {
      await linkProjectRepo(created.id, toRepoInput(repo, userId)).catch(
        (error: unknown) => {
          console.error("Project repo link failed", error);
        },
      );
    }
    revalidatePath("/build");
    if (ideaId) {
      revalidatePath(`/ideas/${ideaId}`);
    }
    return { status: "created", id: created.id };
  } catch (error) {
    console.error("Project create failed", error);
    if (newRepo) {
      return {
        ...failure(
          `${newRepo.fullName} was created on GitHub, but the project could not be saved. Try again to link it.`,
        ),
        createdRepoUrl: newRepo.htmlUrl,
      };
    }
    return failure("The project could not be saved. Try again.");
  }
}

export type UpdateProjectResult =
  | { status: "saved"; canStillView: boolean }
  | Failure;

export async function updateProjectFromStudio(
  projectId: string,
  draft: unknown,
): Promise<UpdateProjectResult> {
  const context = await requireProjectOwner(projectId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = updateProjectSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const { project, userId } = context;
  const currentIds = new Set(project.members.map((member) => member.clerkUserId));
  const additions = parsed.data.members.filter(
    (member) => !currentIds.has(member.clerkUserId),
  );
  const accountsProblem = await checkAccounts(
    additions.map((member) => member.clerkUserId),
    "members",
  );
  if (accountsProblem) {
    return accountsProblem;
  }

  try {
    await updateProjectDetails(projectId, parsed.data);
  } catch (error) {
    console.error("Project update failed", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Keep at least one owner.") {
      return failure(message, { members: message });
    }
    return failure("The project could not be saved. Try again.");
  }
  revalidateProject(projectId);
  const stillMember = parsed.data.members.some((member) => member.clerkUserId === userId);
  return { status: "saved", canStillView: parsed.data.isPublic || stillMember };
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export type RepoResult = { status: "ok"; repo: ProjectRepo } | Failure;

export async function linkRepoToProject(projectId: string, url: string): Promise<RepoResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  const lookup = await lookupRepo(String(url ?? ""), context.userId);
  if (lookup.status === "error") {
    return failure(lookup.message, { url: lookup.message });
  }
  try {
    const repo = await linkProjectRepo(projectId, toRepoInput(lookup.repo, context.userId));
    revalidateProject(projectId);
    return { status: "ok", repo };
  } catch (error) {
    console.error("Project repo link failed", error);
    return failure("The repository could not be linked. Try again.");
  }
}

export async function unlinkRepoFromProject(
  projectId: string,
  repoRowId: string,
): Promise<{ status: "ok" } | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(repoRowId).success) {
    return failure("That repository is not linked.");
  }
  await unlinkProjectRepo(projectId, repoRowId);
  revalidateProject(projectId);
  return { status: "ok" };
}

export async function setProjectPrimaryRepo(
  projectId: string,
  repoRowId: string,
): Promise<{ status: "ok" } | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(repoRowId).success) {
    return failure("That repository is not linked.");
  }
  await setPrimaryProjectRepo(projectId, repoRowId);
  revalidateProject(projectId);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export type MilestoneResult = { status: "ok"; milestone: ProjectMilestone } | Failure;

export async function createMilestoneAction(
  projectId: string,
  draft: unknown,
): Promise<MilestoneResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = milestoneSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  try {
    const milestone = await createMilestone(projectId, parsed.data);
    revalidateProject(projectId);
    return { status: "ok", milestone };
  } catch (error) {
    console.error("Milestone create failed", error);
    return failure("The milestone could not be saved. Try again.");
  }
}

export async function updateMilestoneAction(
  projectId: string,
  milestoneId: string,
  draft: unknown,
): Promise<MilestoneResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(milestoneId).success) {
    return failure("That milestone does not exist.");
  }
  const parsed = milestoneSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const milestone = await updateMilestone(projectId, milestoneId, parsed.data);
  if (!milestone) {
    return failure("That milestone does not exist.");
  }
  revalidateProject(projectId);
  return { status: "ok", milestone };
}

export async function deleteMilestoneAction(
  projectId: string,
  milestoneId: string,
): Promise<{ status: "ok" } | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(milestoneId).success) {
    return failure("That milestone does not exist.");
  }
  await deleteMilestone(projectId, milestoneId);
  revalidateProject(projectId);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export type TicketResult = { status: "ok"; ticket: TicketWithDetails } | Failure;

function checkTicketLinks(
  project: ProjectWithDetails,
  input: { milestoneId: string | null; repoId: string | null; assigneeClerkUserId: string | null },
): Failure | null {
  if (input.milestoneId && !project.milestones.some((m) => m.id === input.milestoneId)) {
    return failure("That milestone is not on this project.", {
      milestoneId: "Pick one of this project's milestones.",
    });
  }
  if (input.repoId && !project.repos.some((repo) => repo.id === input.repoId)) {
    return failure("That repository is not linked to this project.", {
      repoId: "Pick one of this project's repositories.",
    });
  }
  if (
    input.assigneeClerkUserId &&
    !project.members.some((member) => member.clerkUserId === input.assigneeClerkUserId)
  ) {
    return failure("Assign the ticket to someone on the project.", {
      assigneeClerkUserId: "Pick a project member.",
    });
  }
  return null;
}

export async function createTicketAction(
  projectId: string,
  draft: unknown,
): Promise<TicketResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = ticketSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const linkProblem = checkTicketLinks(context.project, parsed.data);
  if (linkProblem) {
    return linkProblem;
  }
  try {
    const ticket = await createTicket(projectId, context.userId, parsed.data);
    revalidateProject(projectId);
    return { status: "ok", ticket };
  } catch (error) {
    console.error("Ticket create failed", error);
    return failure("The ticket could not be saved. Try again.");
  }
}

export async function updateTicketAction(
  projectId: string,
  ticketId: string,
  draft: unknown,
): Promise<TicketResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const parsed = ticketSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const linkProblem = checkTicketLinks(context.project, parsed.data);
  if (linkProblem) {
    return linkProblem;
  }
  try {
    const ticket = await updateTicket(projectId, ticketId, parsed.data);
    if (!ticket) {
      return failure("That ticket does not exist.");
    }
    revalidateProject(projectId);
    revalidatePath(ticketPath(projectId, ticket.number));
    return { status: "ok", ticket };
  } catch (error) {
    console.error("Ticket update failed", error);
    return failure("The ticket could not be saved. Try again.");
  }
}

export async function moveTicketAction(
  projectId: string,
  ticketId: string,
  draft: unknown,
): Promise<TicketResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const parsed = moveTicketSchema.safeParse(draft);
  if (!parsed.success) {
    return failure(
      parsed.error.issues[0]?.message ?? "Check the status and try again.",
      fieldErrorsFrom(parsed.error),
    );
  }
  try {
    const ticket = await moveTicket(
      projectId,
      ticketId,
      parsed.data.status,
      parsed.data.blockedReason,
    );
    if (!ticket) {
      return failure("That ticket does not exist.");
    }
    revalidateProject(projectId);
    revalidatePath(ticketPath(projectId, ticket.number));
    revalidatePath(ticketsPath(projectId));
    return { status: "ok", ticket };
  } catch (error) {
    console.error("Ticket move failed", error);
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Say what is blocking")) {
      return failure(message, { blockedReason: message });
    }
    return failure("The ticket could not be moved. Try again.");
  }
}

/** Board moves: a status column and a position within it. */
export async function reorderTicketAction(
  projectId: string,
  ticketId: string,
  draft: unknown,
): Promise<TicketResult> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const parsed = reorderTicketSchema.safeParse(draft);
  if (!parsed.success) {
    return failure("Check the move and try again.", fieldErrorsFrom(parsed.error));
  }
  if (parsed.data.status === "BLOCKED" && !parsed.data.blockedReason) {
    return failure("Say what is blocking this ticket.", {
      blockedReason: "Say what is blocking this ticket.",
    });
  }
  try {
    const ticket = await reorderTicket(
      projectId,
      ticketId,
      parsed.data.status,
      parsed.data.index,
      parsed.data.blockedReason || null,
    );
    if (!ticket) {
      return failure("That ticket does not exist.");
    }
    revalidateProject(projectId);
    return { status: "ok", ticket };
  } catch (error) {
    console.error("Ticket reorder failed", error);
    return failure("The ticket could not be moved. Try again.");
  }
}

export async function deleteTicketAction(
  projectId: string,
  ticketId: string,
): Promise<{ status: "ok" } | Failure> {
  const context = await requireProjectMember(projectId);
  if (isFailure(context)) {
    return context;
  }
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  await deleteTicket(projectId, ticketId);
  revalidateProject(projectId);
  return { status: "ok" };
}
