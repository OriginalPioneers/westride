import "server-only";
import { createProject, linkProjectRepo } from "@westride/db/build";
import { findIdeaLinkedToGithubRepo } from "@westride/db/claims";
import { linkIdeaGithubRepo } from "@westride/db/github";
import { createIdea } from "@westride/db/ideas";
import { ideaDescriptionFromRepo, ideaNameFromRepo } from "@/lib/github/idea-draft";
import type { GithubRepoRef } from "@/lib/github/repo-ref";
import { findReadableRepo, readRepoReadme, type GithubRepo } from "@/lib/github/repos";

const MAX_TOPIC_TAGS = 8;

export type ImportOutcome =
  | { status: "created"; ideaId: string; projectId: string; repo: GithubRepo }
  | { status: "exists"; ideaId: string; repo: GithubRepo }
  /** Imports are public and unowned, so a private repository cannot be one. */
  | { status: "private"; repo: GithubRepo }
  | { status: "unavailable"; reason: "needs-connection" | "needs-access" };

/**
 * Creates a public, unclaimed idea and a project from a public repository.
 * Neither has a team until someone claims them. A repository already on
 * WeStride is not imported twice.
 */
export async function importGithubRepository(
  ref: GithubRepoRef,
  actorClerkUserId: string | null,
): Promise<ImportOutcome> {
  const access = await findReadableRepo(ref, actorClerkUserId);
  if (access.status === "unavailable") {
    return { status: "unavailable", reason: access.reason };
  }
  const { repo } = access;
  if (repo.isPrivate) {
    return { status: "private", repo };
  }

  const linked = await findIdeaLinkedToGithubRepo(repo.id);
  if (linked) {
    return { status: "exists", ideaId: linked.ideaId, repo };
  }

  const readme = await readRepoReadme(ref, access.token);
  const name = ideaNameFromRepo(repo.name);
  const description = ideaDescriptionFromRepo(repo.description, readme);
  const repoLink = {
    repoId: repo.id,
    owner: repo.owner,
    name: repo.name,
    htmlUrl: repo.htmlUrl,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    linkedByClerkUserId: null,
  };

  const idea = await createIdea({
    name,
    description,
    type: "OPEN_SOURCE",
    isFeatured: false,
    isPublic: true,
    origin: "IMPORT",
    members: [],
    countryCodes: [],
    tagNames: repo.topics.slice(0, MAX_TOPIC_TAGS),
  });
  await linkIdeaGithubRepo(idea.id, repoLink);

  const project = await createProject({
    name,
    description,
    isPublic: true,
    ideaId: idea.id,
    status: "BUILDING",
    origin: "IMPORT",
    members: [],
  });
  await linkProjectRepo(project.id, repoLink);

  return { status: "created", ideaId: idea.id, projectId: project.id, repo };
}
