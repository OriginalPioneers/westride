import "server-only";
import { deleteGithubConnection, getGithubConnection } from "@westride/db/github";
import { installationToken, publicReadToken, repoInstallationId } from "./app";
import { getGithubAppConfig, requireGithubAppConfig } from "./config";
import { GithubApiError, githubJson, githubText, isGithubStatus } from "./http";
import type { GithubRepoRef } from "./repo-ref";
import { getGithubUserToken } from "./user";

type RawRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  archived: boolean;
  owner: { login: string };
  permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
};

export type GithubRepo = {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  isArchived: boolean;
  /** Whether the member can push. Null when read without their token. */
  canPush: boolean | null;
};

function toRepo(raw: RawRepo, viaMember: boolean): GithubRepo {
  return {
    id: raw.id,
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    htmlUrl: raw.html_url,
    description: raw.description,
    defaultBranch: raw.default_branch,
    isPrivate: raw.private,
    isArchived: raw.archived,
    canPush: viaMember ? Boolean(raw.permissions?.push) : null,
  };
}

function repoPath(ref: GithubRepoRef): string {
  return `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
}

/** A user token GitHub has stopped accepting. The member must reconnect. */
async function dropRevokedConnection(clerkUserId: string, error: unknown) {
  if (isGithubStatus(error, 401)) {
    await deleteGithubConnection(clerkUserId);
    return true;
  }
  return false;
}

export type RepoAccess =
  | { status: "found"; repo: GithubRepo; token: string | null }
  | {
      status: "unavailable";
      /**
       * `needs-connection`: not connected, and the repo is private or missing.
       * `needs-access`: connected, but the member has not granted this repo.
       */
      reason: "needs-connection" | "needs-access";
    };

/**
 * Finds a repository the member may read. Their own token comes first, so a
 * private repo is only found when they can see it on GitHub and have granted
 * it to WeStride. Public repos fall back to WeStride's token, or anonymous.
 */
export async function findReadableRepo(
  ref: GithubRepoRef,
  clerkUserId: string | null,
): Promise<RepoAccess> {
  const hasApp = getGithubAppConfig() !== null;
  const userToken =
    hasApp && clerkUserId ? await getGithubUserToken(clerkUserId) : null;

  if (userToken && clerkUserId) {
    try {
      const raw = await githubJson<RawRepo>(repoPath(ref), { token: userToken });
      return { status: "found", repo: toRepo(raw, true), token: userToken };
    } catch (error) {
      if (await dropRevokedConnection(clerkUserId, error)) {
        return findReadableRepo(ref, clerkUserId);
      }
      const isRateLimited =
        error instanceof GithubApiError && error.isRateLimited;
      if (!isGithubStatus(error, 403, 404) || isRateLimited) {
        throw error;
      }
    }
  }

  const serviceToken = hasApp ? await publicReadToken() : null;
  try {
    const raw = await githubJson<RawRepo>(repoPath(ref), { token: serviceToken });
    // WeStride's own installation can see its private repos. Members cannot.
    if (!raw.private) {
      return { status: "found", repo: toRepo(raw, false), token: serviceToken };
    }
  } catch (error) {
    if (!isGithubStatus(error, 404)) {
      throw error;
    }
  }

  return {
    status: "unavailable",
    reason: userToken ? "needs-access" : "needs-connection",
  };
}

/** The repository's README as Markdown, or null when it has none. */
export async function readRepoReadme(
  ref: GithubRepoRef,
  token: string | null,
): Promise<string | null> {
  try {
    return await githubText(`${repoPath(ref)}/readme`, { token });
  } catch (error) {
    if (isGithubStatus(error, 404)) {
      return null;
    }
    throw error;
  }
}

type RawInstallation = {
  id: number;
  html_url: string;
  repository_selection: "all" | "selected";
  account: { login: string; type: string; avatar_url: string | null } | null;
};

export type GithubInstallation = {
  id: number;
  accountLogin: string;
  isOrganization: boolean;
  avatarUrl: string | null;
  repositorySelection: "all" | "selected";
  /** GitHub's page for choosing which repositories the app can reach. */
  manageUrl: string;
};

export type GithubAccountAccess = {
  login: string;
  avatarUrl: string | null;
  installations: GithubInstallation[];
  repos: GithubRepo[];
  /** Repositories beyond `repos` that were not listed. */
  unlistedRepoCount: number;
};

export async function hasGithubInstallations(userToken: string): Promise<boolean> {
  const { total_count } = await githubJson<{ total_count: number }>(
    "/user/installations?per_page=1",
    { token: userToken },
  );
  return total_count > 0;
}

const REPOS_PER_INSTALLATION = 100;

/**
 * Everything the settings page shows: the member's GitHub account, where the
 * app is installed for them, and which repositories it can reach. Null when
 * they are not connected.
 */
export async function getGithubAccountAccess(
  clerkUserId: string,
): Promise<GithubAccountAccess | null> {
  const [connection, token] = await Promise.all([
    getGithubConnection(clerkUserId),
    getGithubUserToken(clerkUserId),
  ]);
  if (!connection || !token) {
    return null;
  }

  let rawInstallations: RawInstallation[];
  try {
    ({ installations: rawInstallations } = await githubJson<{
      installations: RawInstallation[];
    }>("/user/installations?per_page=100", { token }));
  } catch (error) {
    if (await dropRevokedConnection(clerkUserId, error)) {
      return null;
    }
    throw error;
  }

  const installations = rawInstallations.map(
    (raw): GithubInstallation => ({
      id: raw.id,
      accountLogin: raw.account?.login ?? "Unknown account",
      isOrganization: raw.account?.type === "Organization",
      avatarUrl: raw.account?.avatar_url ?? null,
      repositorySelection: raw.repository_selection,
      manageUrl: raw.html_url,
    }),
  );

  const pages = await Promise.all(
    installations.map((installation) =>
      githubJson<{ total_count: number; repositories: RawRepo[] }>(
        `/user/installations/${installation.id}/repositories?per_page=${REPOS_PER_INSTALLATION}`,
        { token },
      ),
    ),
  );

  const repos = pages
    .flatMap((page) => page.repositories.map((raw) => toRepo(raw, true)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "en"));
  const total = pages.reduce((sum, page) => sum + page.total_count, 0);

  return {
    login: connection.login,
    avatarUrl: connection.avatarUrl,
    installations,
    repos,
    unlistedRepoCount: Math.max(0, total - repos.length),
  };
}

export class GithubWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubWriteError";
  }
}

async function requireUserToken(clerkUserId: string): Promise<string> {
  requireGithubAppConfig();
  const token = await getGithubUserToken(clerkUserId);
  if (!token) {
    throw new GithubWriteError("Connect GitHub in Settings first.");
  }
  return token;
}

const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Creates a repository as the member, under their account or an organization
 * they may create repositories in. GitHub enforces their rights, so WeStride
 * cannot create anywhere the member could not.
 */
export async function createGithubRepo(
  clerkUserId: string,
  input: {
    /** Organization login. Omit for the member's own account. */
    organization?: string;
    name: string;
    description?: string;
    isPrivate: boolean;
  },
): Promise<GithubRepo> {
  const token = await requireUserToken(clerkUserId);
  if (!REPO_NAME.test(input.name) || input.name === "." || input.name === "..") {
    throw new GithubWriteError(
      "Use letters, numbers, dots, dashes, or underscores for the repository name.",
    );
  }

  const organization = input.organization?.trim();
  const path = organization
    ? `/orgs/${encodeURIComponent(organization)}/repos`
    : "/user/repos";
  try {
    const raw = await githubJson<RawRepo>(path, {
      method: "POST",
      token,
      body: {
        name: input.name,
        description: input.description ?? "",
        private: input.isPrivate,
        // Commits go through the Git Data API, which cannot start from an empty repo.
        auto_init: true,
      },
    });
    return toRepo(raw, true);
  } catch (error) {
    if (isGithubStatus(error, 422)) {
      throw new GithubWriteError(
        `${organization ?? "Your account"} already has a repository with that name.`,
      );
    }
    if (isGithubStatus(error, 403, 404)) {
      throw new GithubWriteError(
        "GitHub did not allow WeStride to create a repository there.",
      );
    }
    throw error;
  }
}

export type GithubFileChange = {
  /** Repository-relative path, e.g. `src/index.ts`. */
  path: string;
  /** UTF-8 text. `null` deletes the file. */
  content: string | null;
};

function assertSafePath(path: string) {
  const parts = path.split("/");
  if (
    !path ||
    path.startsWith("/") ||
    parts.some((part) => !part || part === "." || part === "..") ||
    parts[0] === ".git"
  ) {
    throw new GithubWriteError(`"${path}" is not a valid file path.`);
  }
}

function refPath(branch: string): string {
  return branch.split("/").map(encodeURIComponent).join("/");
}

/**
 * Writes files in one commit. The member must be able to push, but the
 * commit is made by the WeStride app, so GitHub shows WeStride as its author
 * (or `GITHUB_COMMIT_AUTHOR_*` when set). A missing branch is created from
 * the default branch.
 */
export async function commitGithubFiles(
  clerkUserId: string,
  input: {
    ref: GithubRepoRef;
    branch?: string;
    message: string;
    files: GithubFileChange[];
  },
): Promise<{ sha: string; htmlUrl: string; branch: string }> {
  const { commitAuthor } = requireGithubAppConfig();
  if (input.files.length === 0) {
    throw new GithubWriteError("There is nothing to commit.");
  }
  input.files.forEach((file) => assertSafePath(file.path));

  const userToken = await requireUserToken(clerkUserId);
  let repo: GithubRepo;
  try {
    repo = toRepo(
      await githubJson<RawRepo>(repoPath(input.ref), { token: userToken }),
      true,
    );
  } catch (error) {
    if (isGithubStatus(error, 403, 404)) {
      throw new GithubWriteError(
        "Grant WeStride access to this repository on GitHub first.",
      );
    }
    throw error;
  }
  if (!repo.canPush) {
    throw new GithubWriteError("You do not have write access to this repository.");
  }
  if (repo.isArchived) {
    throw new GithubWriteError("This repository is archived on GitHub.");
  }

  let token: string;
  try {
    token = await installationToken(await repoInstallationId(input.ref), {
      repository_ids: [repo.id],
      permissions: { contents: "write", metadata: "read" },
    });
  } catch (error) {
    if (isGithubStatus(error, 404, 422)) {
      throw new GithubWriteError(
        "Grant WeStride access to this repository on GitHub first.",
      );
    }
    throw error;
  }

  const base = repoPath(input.ref);
  const branch = input.branch?.trim() || repo.defaultBranch;

  let headSha: string;
  try {
    headSha = (
      await githubJson<{ object: { sha: string } }>(
        `${base}/git/ref/heads/${refPath(branch)}`,
        { token },
      )
    ).object.sha;
  } catch (error) {
    if (isGithubStatus(error, 409)) {
      throw new GithubWriteError("This repository is empty. Add a first commit on GitHub.");
    }
    if (!isGithubStatus(error, 404) || branch === repo.defaultBranch) {
      throw error;
    }
    const from = await githubJson<{ object: { sha: string } }>(
      `${base}/git/ref/heads/${refPath(repo.defaultBranch)}`,
      { token },
    );
    await githubJson(`${base}/git/refs`, {
      method: "POST",
      token,
      body: { ref: `refs/heads/${branch}`, sha: from.object.sha },
    });
    headSha = from.object.sha;
  }

  const parent = await githubJson<{ tree: { sha: string } }>(
    `${base}/git/commits/${headSha}`,
    { token },
  );
  const tree = await githubJson<{ sha: string }>(`${base}/git/trees`, {
    method: "POST",
    token,
    body: {
      base_tree: parent.tree.sha,
      tree: input.files.map((file) =>
        file.content === null
          ? { path: file.path, mode: "100644", type: "blob", sha: null }
          : { path: file.path, mode: "100644", type: "blob", content: file.content },
      ),
    },
  });
  const commit = await githubJson<{ sha: string; html_url: string }>(
    `${base}/git/commits`,
    {
      method: "POST",
      token,
      body: {
        message: input.message,
        tree: tree.sha,
        parents: [headSha],
        ...(commitAuthor
          ? { author: { ...commitAuthor, date: new Date().toISOString() } }
          : {}),
      },
    },
  );

  try {
    await githubJson(`${base}/git/refs/heads/${refPath(branch)}`, {
      method: "PATCH",
      token,
      body: { sha: commit.sha, force: false },
    });
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 422) {
      throw new GithubWriteError(
        `${branch} moved while WeStride was committing. Try again.`,
      );
    }
    throw error;
  }

  return { sha: commit.sha, htmlUrl: commit.html_url, branch };
}
