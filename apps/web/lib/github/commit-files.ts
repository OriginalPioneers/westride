import "server-only";

import type { ChangedFile } from "@westride/runner-protocol";
import { installationToken, repoInstallationId } from "./app";
import { githubJson, isGithubStatus } from "./http";
import type { GithubRepoRef } from "./repo-ref";

export type CommitFilesInput = {
  ref: GithubRepoRef;
  /** The commit the changes were made against. The branch is created from it. */
  baseSha: string;
  branch: string;
  message: string;
  changed: ChangedFile[];
  deleted: string[];
  author: { name: string; email: string };
};

export type CommitFilesResult = { headSha: string; files: number };

type TreeEntry = {
  path: string;
  mode: "100644" | "100755";
  type: "blob";
  sha: string | null;
};

/**
 * Writes a set of files as one commit on a new branch, through GitHub's Git
 * Data API with WeStride's installation token. This is how a supporter's
 * device gets its work into the repository without ever holding a GitHub
 * credential: it sends the files, WeStride makes the commit.
 */
export async function commitFilesToBranch(input: CommitFilesInput): Promise<CommitFilesResult> {
  const { ref, baseSha, branch } = input;
  const token = await installationToken(await repoInstallationId(ref), {
    permissions: { contents: "write", metadata: "read" },
  });
  const base = `/repos/${ref.owner}/${ref.repo}`;

  const baseCommit = await githubJson<{ tree: { sha: string } }>(`${base}/git/commits/${baseSha}`, { token });

  const entries: TreeEntry[] = [];
  for (const file of input.changed) {
    const blob = await githubJson<{ sha: string }>(`${base}/git/blobs`, {
      method: "POST",
      token,
      body: { content: file.contentBase64, encoding: "base64" },
    });
    entries.push({ path: file.path, mode: file.mode, type: "blob", sha: blob.sha });
  }
  for (const path of input.deleted) {
    entries.push({ path, mode: "100644", type: "blob", sha: null });
  }

  const tree = await githubJson<{ sha: string }>(`${base}/git/trees`, {
    method: "POST",
    token,
    body: { base_tree: baseCommit.tree.sha, tree: entries },
  });

  const commit = await githubJson<{ sha: string }>(`${base}/git/commits`, {
    method: "POST",
    token,
    body: {
      message: input.message,
      tree: tree.sha,
      parents: [baseSha],
      author: { ...input.author, date: new Date().toISOString() },
    },
  });

  try {
    await githubJson(`${base}/git/refs`, {
      method: "POST",
      token,
      body: { ref: `refs/heads/${branch}`, sha: commit.sha },
    });
  } catch (error) {
    // The branch already exists (a retried result); move it instead.
    if (!isGithubStatus(error, 422)) {
      throw error;
    }
    await githubJson(`${base}/git/refs/heads/${branch}`, {
      method: "PATCH",
      token,
      body: { sha: commit.sha, force: true },
    });
  }

  return { headSha: commit.sha, files: entries.length };
}
