import "server-only";

import type { ProjectRepo } from "@westride/db";
import { githubJson } from "@/lib/github/http";
import { findReadableRepo } from "@/lib/github/repos";

/**
 * What is happening in a project's repositories, read live from GitHub with
 * the viewer's own access. Nothing here is stored: it is a window onto the
 * repositories, and members see exactly what GitHub lets them see.
 */

export type ActivityCommit = {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  committedAt: string;
  htmlUrl: string;
};

export type ActivityPullRequest = {
  number: number;
  title: string;
  state: "open" | "merged" | "closed";
  isDraft: boolean;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  headBranch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  htmlUrl: string;
  /** Ticket numbers this PR refers to, by key or branch name. */
  ticketNumbers: number[];
};

export type ActivityBranch = {
  name: string;
  sha: string;
  isDefault: boolean;
  isProtected: boolean;
  ticketNumbers: number[];
};

export type ActivityDeployment = {
  id: number;
  environment: string;
  ref: string;
  sha: string;
  createdAt: string;
  state: string | null;
  targetUrl: string | null;
  creatorLogin: string | null;
};

export type RepoActivity = {
  repo: ProjectRepo;
  status: "ok" | "unavailable" | "error";
  /** Why nothing could be read, when status is not ok. */
  note: string | null;
  commits: ActivityCommit[];
  pullRequests: ActivityPullRequest[];
  branches: ActivityBranch[];
  deployments: ActivityDeployment[];
};

type RawCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
    committer: { name: string; date: string } | null;
  };
  author: { login: string; avatar_url: string } | null;
};

type RawPull = {
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  user: { login: string; avatar_url: string } | null;
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  html_url: string;
};

type RawBranch = {
  name: string;
  commit: { sha: string };
  protected: boolean;
};

type RawDeployment = {
  id: number;
  environment: string;
  ref: string;
  sha: string;
  created_at: string;
  creator: { login: string } | null;
};

type RawDeploymentStatus = {
  state: string;
  target_url: string | null;
  environment_url?: string | null;
};

const COMMITS = 25;
const PULLS = 25;
const BRANCHES = 60;
const DEPLOYMENTS = 10;
/** How many deployments get their latest status looked up. */
const DEPLOYMENT_STATUSES = 5;

function base(repo: ProjectRepo): string {
  return `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
}

/**
 * Finds ticket numbers in free text. A ticket key is the project prefix and
 * a number (`GT-12`); agent branches are `westride/gt-12-slug`. Matching on
 * the prefix keeps `PR-1` in another project from lighting up here.
 */
export function ticketNumbersIn(text: string, prefix: string): number[] {
  const pattern = new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegExp(prefix)}-(\\d{1,6})(?![0-9])`, "gi");
  const numbers = new Set<number>();
  for (const match of text.matchAll(pattern)) {
    const value = Number.parseInt(match[1]!, 10);
    if (Number.isInteger(value) && value > 0) {
      numbers.add(value);
    }
  }
  return [...numbers].sort((a, b) => a - b);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readCommits(repo: ProjectRepo, token: string | null): Promise<ActivityCommit[]> {
  const raw = await githubJson<RawCommit[]>(`${base(repo)}/commits?per_page=${COMMITS}`, {
    token,
  });
  return raw.map((commit) => ({
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    message: commit.commit.message.split("\n", 1)[0] ?? "",
    authorName: commit.commit.author?.name ?? commit.commit.committer?.name ?? "Unknown",
    authorLogin: commit.author?.login ?? null,
    authorAvatarUrl: commit.author?.avatar_url ?? null,
    committedAt:
      commit.commit.author?.date ?? commit.commit.committer?.date ?? new Date(0).toISOString(),
    htmlUrl: commit.html_url,
  }));
}

async function readPulls(
  repo: ProjectRepo,
  token: string | null,
  prefix: string,
): Promise<ActivityPullRequest[]> {
  const raw = await githubJson<RawPull[]>(
    `${base(repo)}/pulls?state=all&sort=updated&direction=desc&per_page=${PULLS}`,
    { token },
  );
  return raw.map((pull) => ({
    number: pull.number,
    title: pull.title,
    state: pull.merged_at ? "merged" : pull.state,
    isDraft: pull.draft,
    authorLogin: pull.user?.login ?? null,
    authorAvatarUrl: pull.user?.avatar_url ?? null,
    headBranch: pull.head.ref,
    baseBranch: pull.base.ref,
    createdAt: pull.created_at,
    updatedAt: pull.updated_at,
    mergedAt: pull.merged_at,
    htmlUrl: pull.html_url,
    ticketNumbers: ticketNumbersIn(`${pull.title} ${pull.head.ref}`, prefix),
  }));
}

async function readBranches(
  repo: ProjectRepo,
  token: string | null,
  prefix: string,
): Promise<ActivityBranch[]> {
  const raw = await githubJson<RawBranch[]>(`${base(repo)}/branches?per_page=${BRANCHES}`, {
    token,
  });
  return raw
    .map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      isDefault: branch.name === repo.defaultBranch,
      isProtected: branch.protected,
      ticketNumbers: ticketNumbersIn(branch.name, prefix),
    }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
}

async function readDeployments(
  repo: ProjectRepo,
  token: string | null,
): Promise<ActivityDeployment[]> {
  const raw = await githubJson<RawDeployment[]>(
    `${base(repo)}/deployments?per_page=${DEPLOYMENTS}`,
    { token },
  );
  const statuses = await Promise.all(
    raw.slice(0, DEPLOYMENT_STATUSES).map(async (deployment) => {
      try {
        const [latest] = await githubJson<RawDeploymentStatus[]>(
          `${base(repo)}/deployments/${deployment.id}/statuses?per_page=1`,
          { token },
        );
        return latest ?? null;
      } catch {
        return null;
      }
    }),
  );
  return raw.map((deployment, index) => {
    const status = statuses[index] ?? null;
    return {
      id: deployment.id,
      environment: deployment.environment,
      ref: deployment.ref,
      sha: deployment.sha.slice(0, 7),
      createdAt: deployment.created_at,
      state: status?.state ?? null,
      targetUrl: status?.environment_url ?? status?.target_url ?? null,
      creatorLogin: deployment.creator?.login ?? null,
    };
  });
}

function empty(repo: ProjectRepo, status: RepoActivity["status"], note: string | null) {
  return { repo, status, note, commits: [], pullRequests: [], branches: [], deployments: [] };
}

export async function readRepoActivity(
  repo: ProjectRepo,
  viewerClerkUserId: string | null,
  ticketPrefix: string,
): Promise<RepoActivity> {
  let token: string | null;
  try {
    const access = await findReadableRepo({ owner: repo.owner, repo: repo.name }, viewerClerkUserId);
    if (access.status !== "found") {
      return empty(
        repo,
        "unavailable",
        access.reason === "needs-connection"
          ? "Connect GitHub in Settings to see this private repository."
          : "Grant WeStride access to this repository on GitHub to see it here.",
      );
    }
    token = access.token;
  } catch (error) {
    console.error("Repo access check failed", repo.htmlUrl, error);
    return empty(repo, "error", "GitHub could not be reached right now.");
  }

  const [commits, pullRequests, branches, deployments] = await Promise.all([
    orEmpty(readCommits(repo, token), "commits", repo),
    orEmpty(readPulls(repo, token, ticketPrefix), "pulls", repo),
    orEmpty(readBranches(repo, token, ticketPrefix), "branches", repo),
    orEmpty(readDeployments(repo, token), "deployments", repo),
  ]);
  return { repo, status: "ok", note: null, commits, pullRequests, branches, deployments };
}

async function orEmpty<T>(promise: Promise<T[]>, what: string, repo: ProjectRepo): Promise<T[]> {
  try {
    return await promise;
  } catch (error) {
    console.error(`GitHub ${what} read failed for ${repo.owner}/${repo.name}`, error);
    return [];
  }
}

export async function readProjectActivity(
  repos: ProjectRepo[],
  viewerClerkUserId: string | null,
  ticketPrefix: string,
): Promise<RepoActivity[]> {
  const ordered = [...repos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return Promise.all(
    ordered.map((repo) => readRepoActivity(repo, viewerClerkUserId, ticketPrefix)),
  );
}
