export type GithubRepoRef = { owner: string; repo: string };

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

export function isGithubRepoName(name: string): boolean {
  return REPO.test(name) && name !== "." && name !== "..";
}

/** A repository name GitHub accepts, made from a project name. */
export function suggestGithubRepoName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 100)
    .replace(/^[-.]+|[-.]+$/g, "");
}

function toRef(owner: string | undefined, repo: string | undefined) {
  const name = repo?.replace(/\.git$/i, "");
  if (!owner || !name || !OWNER.test(owner) || !isGithubRepoName(name)) {
    return null;
  }
  return { owner, repo: name };
}

/**
 * Reads the repository out of whatever someone pastes: a browser URL (any
 * page inside the repo), a clone URL, an SSH remote, or `owner/repo`.
 */
export function parseGithubRepoRef(input: string): GithubRepoRef | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const ssh = /^git@github\.com:([^/]+)\/([^/]+?)\/?$/i.exec(value);
  if (ssh) {
    return toRef(ssh[1], ssh[2]);
  }

  // Owners cannot contain dots, so "github.com/owner" falls through to the URL parse.
  const shorthand = /^([^/\s:]+)\/([^/\s]+)$/.exec(value);
  if (shorthand && OWNER.test(shorthand[1] ?? "")) {
    return toRef(shorthand[1], shorthand[2]);
  }

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return null;
  }
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  return toRef(owner, repo);
}

export function githubRepoUrl(ref: GithubRepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}
