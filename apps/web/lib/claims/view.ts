import "server-only";
import { getPendingClaimRequest, isClaimableIdea } from "@westride/db/claims";
import { getGithubConnection } from "@westride/db/github";
import type { IdeaWithDetails } from "@westride/db/ideas";
import type { ClaimIdeaCardProps } from "@/app/(main)/ideas/claim-idea-card";
import { isEmailConfigured } from "@/lib/email/resend";

/**
 * What the claim card needs for this viewer, or null when the idea is not
 * up for claiming.
 */
export async function claimCardProps(
  idea: IdeaWithDetails,
  viewerId: string | null,
  options: { returnTo: string; surface: ClaimIdeaCardProps["surface"] },
): Promise<ClaimIdeaCardProps | null> {
  if (!isClaimableIdea(idea)) {
    return null;
  }
  const [connection, pending] = viewerId
    ? await Promise.all([
        getGithubConnection(viewerId),
        getPendingClaimRequest(idea.id, viewerId),
      ])
    : [null, null];
  return {
    ideaId: idea.id,
    repo: idea.githubRepo
      ? {
          fullName: `${idea.githubRepo.owner}/${idea.githubRepo.name}`,
          htmlUrl: idea.githubRepo.htmlUrl,
        }
      : null,
    isSignedIn: viewerId !== null,
    hasGithubConnection: connection !== null,
    hasPendingRequest: pending !== null,
    canRequest: isEmailConfigured(),
    returnTo: options.returnTo,
    surface: options.surface,
  };
}
