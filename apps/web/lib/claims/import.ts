import "server-only";
import { createProject, linkProjectRepo } from "@westride/db/build";
import { listIdeasLinkedToGithubRepo } from "@westride/db/claims";
import { linkIdeaGithubRepo } from "@westride/db/github";
import { createIdea, getIdea } from "@westride/db/ideas";
import { ideaDescriptionFromRepo, ideaNameFromRepo } from "@/lib/github/idea-draft";
import type { GithubRepoRef } from "@/lib/github/repo-ref";
import { findReadableRepo, readRepoReadme, type GithubRepo } from "@/lib/github/repos";

const MAX_TOPIC_TAGS = 8;

export type ImportOutcome =
  | { status: "created"; ideaId: string; projectId: string; repo: GithubRepo }
  | { status: "exists"; ideaId: string; repo: GithubRepo }
  | { status: "unavailable"; reason: "needs-connection" | "needs-access" };

/**
 * Whether a visitor who has not signed in is looking at a public repository.
 * `hidden` means GitHub would not show it to anyone: it is private, or it
 * does not exist.
 */
export async function publicRepoVisibility(
  ref: GithubRepoRef,
): Promise<"public" | "hidden"> {
  const access = await findReadableRepo(ref, null);
  return access.status === "found" ? "public" : "hidden";
}

/** The first idea linked to the repository that the member can see. */
async function findVisibleLinkedIdea(
  repoId: number,
  clerkUserId: string,
): Promise<string | null> {
  for (const link of await listIdeasLinkedToGithubRepo(repoId)) {
    if (await getIdea(link.ideaId, { clerkUserId })) {
      return link.ideaId;
    }
  }
  return null;
}

/**
 * Creates an idea and a project from a repository.
 *
 * A public repository becomes a public, unclaimed idea and project: neither
 * has a team until someone claims them, and it is not imported twice.
 *
 * A private repository is only found when the member can see it on GitHub
 * and has granted it to WeStride. It becomes a private idea and project with
 * the member as founder and owner, so nobody else learns it exists.
 */
export async function importGithubRepository(
  ref: GithubRepoRef,
  actorClerkUserId: string,
): Promise<ImportOutcome> {
  const access = await findReadableRepo(ref, actorClerkUserId);
  if (access.status === "unavailable") {
    return { status: "unavailable", reason: access.reason };
  }
  const { repo } = access;

  const linkedIdeaId = await findVisibleLinkedIdea(repo.id, actorClerkUserId);
  if (linkedIdeaId) {
    return { status: "exists", ideaId: linkedIdeaId, repo };
  }

  const readme = await readRepoReadme(ref, access.token);
  const name = ideaNameFromRepo(repo.name);
  const description = ideaDescriptionFromRepo(repo.description, readme);
  const isPublic = !repo.isPrivate;
  const repoLink = {
    repoId: repo.id,
    owner: repo.owner,
    name: repo.name,
    htmlUrl: repo.htmlUrl,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    linkedByClerkUserId: isPublic ? null : actorClerkUserId,
  };

  const idea = await createIdea({
    name,
    description,
    type: isPublic ? "OPEN_SOURCE" : "BUSINESS",
    isFeatured: false,
    isPublic,
    origin: isPublic ? "IMPORT" : "MEMBER",
    members: isPublic ? [] : [{ clerkUserId: actorClerkUserId, role: "FOUNDER" }],
    countryCodes: [],
    tagNames: repo.topics.slice(0, MAX_TOPIC_TAGS),
  });
  await linkIdeaGithubRepo(idea.id, repoLink);

  const project = await createProject({
    name,
    description,
    isPublic,
    ideaId: idea.id,
    status: "BUILDING",
    origin: isPublic ? "IMPORT" : "MEMBER",
    members: isPublic ? [] : [{ clerkUserId: actorClerkUserId, role: "OWNER" }],
  });
  await linkProjectRepo(project.id, repoLink);

  return { status: "created", ideaId: idea.id, projectId: project.id, repo };
}
