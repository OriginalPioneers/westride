import "server-only";
import { getGithubConnection } from "@westride/db/github";
import { readRepoAsMember, type GithubRepo } from "@/lib/github/repos";

export type ClaimEligibility =
  | {
      status: "eligible";
      /** `owner`: the repo is under their GitHub account. `admin`: they administer it. */
      reason: "owner" | "admin";
      repo: GithubRepo;
    }
  | {
      status: "not-eligible";
      /** Their GitHub login, for the explanation. */
      login: string;
    }
  | { status: "needs-connection" };

/**
 * Whether the member may claim what was imported from a repository: the
 * repository is theirs, or they administer it. Both are checked through
 * their own GitHub token, so GitHub decides. Admin rights are only visible
 * where the WeStride app is installed; ownership needs no installation.
 */
export async function checkClaimEligibility(
  clerkUserId: string,
  repoId: number,
): Promise<ClaimEligibility> {
  const connection = await getGithubConnection(clerkUserId);
  if (!connection) {
    return { status: "needs-connection" };
  }
  const read = await readRepoAsMember(clerkUserId, repoId);
  if (read.status === "needs-connection") {
    return read;
  }
  if (read.status === "not-visible") {
    return { status: "not-eligible", login: connection.login };
  }
  const { repo } = read;
  if (repo.ownerId === connection.githubUserId) {
    return { status: "eligible", reason: "owner", repo };
  }
  if (repo.canAdmin) {
    return { status: "eligible", reason: "admin", repo };
  }
  return { status: "not-eligible", login: connection.login };
}
