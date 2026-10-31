"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { listProjectsForIdea } from "@westride/db/build";
import {
  claimIdea,
  createClaimRequest,
  decideClaimRequest,
  deleteClaimRequest,
  denyOtherClaimRequests,
  getClaimRequest,
  isClaimableIdea,
} from "@westride/db/claims";
import { getIdea } from "@westride/db/ideas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendClaimDecisionEmail, sendClaimRequestEmail } from "@/lib/claims/email";
import { checkClaimEligibility } from "@/lib/claims/github";
import { importGithubRepository } from "@/lib/claims/import";
import { MAX_CLAIM_MESSAGE } from "@/lib/claims/limits";
import {
  hashReviewToken,
  newReviewToken,
  reviewTokenMatches,
} from "@/lib/claims/review-token";
import { isEmailConfigured } from "@/lib/email/resend";
import { isGithubAppConfigured } from "@/lib/github/config";
import { GithubApiError } from "@/lib/github/http";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { requestOrigin } from "@/lib/request-origin";

const uuidSchema = z.string().uuid();
const messageSchema = z.string().trim().max(MAX_CLAIM_MESSAGE);

function githubFailureMessage(error: unknown): string {
  if (error instanceof GithubApiError && error.isRateLimited) {
    return "GitHub is limiting requests right now. Try again in a few minutes.";
  }
  return "GitHub could not be reached. Try again.";
}

function revalidateClaim(ideaId: string, projectIds: string[]) {
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/build");
  for (const projectId of projectIds) {
    revalidatePath(`/build/${projectId}`, "layout");
  }
}

async function importedProjectIds(ideaId: string, viewerId: string | null): Promise<string[]> {
  const projects = await listProjectsForIdea(ideaId, { clerkUserId: viewerId });
  return projects.filter((project) => project.origin === "IMPORT").map((project) => project.id);
}

type Requester = { name: string; email: string | null };

async function requesterProfile(clerkUserId: string): Promise<Requester> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      "A WeStride member";
    return { name, email: user.primaryEmailAddress?.emailAddress ?? null };
  } catch (error) {
    console.error("Claim requester lookup failed", error);
    return { name: "A WeStride member", email: null };
  }
}

// ---------------------------------------------------------------------------
// Claim through GitHub
// ---------------------------------------------------------------------------

export type GithubClaimResult =
  | { status: "claimed" }
  /** Sign in to GitHub first. */
  | { status: "needs-connection"; message: string }
  /** Connected, but GitHub does not show them as owner or admin. */
  | { status: "not-eligible"; message: string }
  | { status: "error"; message: string };

/**
 * Claims an imported idea, and the project built from it, when GitHub shows
 * the member owns or administers the repository it came from.
 */
export async function claimIdeaWithGithub(ideaId: string): Promise<GithubClaimResult> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in to claim this idea." };
  }
  if (!uuidSchema.safeParse(ideaId).success) {
    return { status: "error", message: "That idea does not exist." };
  }
  const idea = await getIdea(ideaId, { clerkUserId: userId });
  if (!idea) {
    return { status: "error", message: "That idea does not exist." };
  }
  if (!isClaimableIdea(idea)) {
    return { status: "error", message: "This idea already has a founder." };
  }
  if (!idea.githubRepo) {
    return {
      status: "error",
      message: "This idea has no repository to check against. Request to claim it instead.",
    };
  }
  if (!isGithubAppConfigured()) {
    return {
      status: "error",
      message: "GitHub is not connected to WeStride right now. Request to claim it instead.",
    };
  }

  const repoName = `${idea.githubRepo.owner}/${idea.githubRepo.name}`;
  try {
    const eligibility = await checkClaimEligibility(userId, idea.githubRepo.repoId);
    if (eligibility.status === "needs-connection") {
      return {
        status: "needs-connection",
        message: "Connect your GitHub account so WeStride can check who maintains the repository.",
      };
    }
    if (eligibility.status === "not-eligible") {
      return {
        status: "not-eligible",
        message: `GitHub does not list @${eligibility.login} as an admin of ${repoName}. If you are one, install WeStride on that repository so GitHub can show it. Otherwise, request to claim it.`,
      };
    }
  } catch (error) {
    console.error("Claim eligibility check failed", error);
    return { status: "error", message: githubFailureMessage(error) };
  }

  try {
    const claimed = await claimIdea(ideaId, userId);
    if (!claimed) {
      return { status: "error", message: "Someone claimed this idea first." };
    }
    await denyOtherClaimRequests(ideaId, null).catch(() => undefined);
  } catch (error) {
    console.error("Idea claim failed", error);
    return { status: "error", message: "The claim could not be saved. Try again." };
  }

  revalidateClaim(ideaId, await importedProjectIds(ideaId, userId));
  return { status: "claimed" };
}

// ---------------------------------------------------------------------------
// Request to claim
// ---------------------------------------------------------------------------

export type ClaimRequestResult =
  | { status: "requested" }
  /** They already have an open request for this idea. */
  | { status: "pending" }
  | { status: "error"; message: string };

/** Files a request the team decides by email. */
export async function requestIdeaClaim(
  ideaId: string,
  message: string,
): Promise<ClaimRequestResult> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Sign in to request this idea." };
  }
  if (!uuidSchema.safeParse(ideaId).success) {
    return { status: "error", message: "That idea does not exist." };
  }
  const parsedMessage = messageSchema.safeParse(message);
  if (!parsedMessage.success) {
    return {
      status: "error",
      message: `Keep your message under ${MAX_CLAIM_MESSAGE} characters.`,
    };
  }
  const idea = await getIdea(ideaId, { clerkUserId: userId });
  if (!idea) {
    return { status: "error", message: "That idea does not exist." };
  }
  if (!isClaimableIdea(idea)) {
    return { status: "error", message: "This idea already has a founder." };
  }
  if (!isEmailConfigured()) {
    return {
      status: "error",
      message: "Claim requests are not available right now. Try claiming through GitHub.",
    };
  }

  const [projectIds, origin, requester] = await Promise.all([
    importedProjectIds(ideaId, userId),
    requestOrigin(),
    requesterProfile(userId),
  ]);
  const token = newReviewToken();

  let requestId: string;
  try {
    const { request, isNew } = await createClaimRequest({
      ideaId,
      projectId: projectIds[0] ?? null,
      clerkUserId: userId,
      message: parsedMessage.data,
      reviewTokenHash: hashReviewToken(token),
    });
    if (!isNew) {
      return { status: "pending" };
    }
    requestId = request.id;
  } catch (error) {
    console.error("Claim request save failed", error);
    return { status: "error", message: "The request could not be saved. Try again." };
  }

  const emailed = await sendClaimRequestEmail({
    requestId,
    token,
    origin,
    ideaId,
    ideaName: idea.name,
    repoFullName: idea.githubRepo ? `${idea.githubRepo.owner}/${idea.githubRepo.name}` : null,
    repoUrl: idea.githubRepo?.htmlUrl ?? null,
    requester: { ...requester, clerkUserId: userId },
    message: parsedMessage.data,
  });
  if (!emailed) {
    // Nobody would ever see the request, so do not leave the member waiting on it.
    console.error(`Claim request ${requestId} could not be emailed to the team; removed.`);
    await deleteClaimRequest(requestId).catch(() => undefined);
    return {
      status: "error",
      message: "The request could not be sent right now. Try again later, or claim through GitHub.",
    };
  }

  revalidatePath(`/ideas/${ideaId}`);
  return { status: "requested" };
}

// ---------------------------------------------------------------------------
// Import a repository
// ---------------------------------------------------------------------------

export type ImportProjectResult =
  | {
      status: "created";
      ideaId: string;
      /** True when the importer owns or administers the repo and became founder at once. */
      claimed: boolean;
    }
  | { status: "exists"; ideaId: string }
  | { status: "needs-sign-in" }
  | { status: "error"; message: string };

/**
 * Creates a public, unclaimed idea and project from a public GitHub
 * repository. When the importer maintains the repository, they claim it on
 * the spot.
 */
export async function importGithubProject(url: string): Promise<ImportProjectResult> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "needs-sign-in" };
  }
  const ref = parseGithubRepoRef(url);
  if (!ref) {
    return {
      status: "error",
      message: "Paste a GitHub repository link, like https://github.com/owner/repo.",
    };
  }
  const fullName = `${ref.owner}/${ref.repo}`;

  let outcome: Awaited<ReturnType<typeof importGithubRepository>>;
  try {
    outcome = await importGithubRepository(ref, userId);
  } catch (error) {
    console.error("GitHub import failed", error);
    return {
      status: "error",
      message:
        error instanceof GithubApiError
          ? githubFailureMessage(error)
          : "The project could not be imported. Try again.",
    };
  }

  switch (outcome.status) {
    case "unavailable":
      return {
        status: "error",
        message: `${fullName} does not exist, or it is private. Only public repositories can be imported.`,
      };
    case "private":
      return {
        status: "error",
        message: `${fullName} is private. Only public repositories can be imported; start a private idea from Idea Studio instead.`,
      };
    case "exists":
      return { status: "exists", ideaId: outcome.ideaId };
    case "created":
      break;
  }

  let claimed = false;
  if (isGithubAppConfigured()) {
    try {
      const eligibility = await checkClaimEligibility(userId, outcome.repo.id);
      if (eligibility.status === "eligible") {
        claimed = await claimIdea(outcome.ideaId, userId);
      }
    } catch (error) {
      console.error("Auto-claim after import failed", error);
    }
  }

  revalidateClaim(outcome.ideaId, [outcome.projectId]);
  return { status: "created", ideaId: outcome.ideaId, claimed };
}

// ---------------------------------------------------------------------------
// Review a request (from the email link)
// ---------------------------------------------------------------------------

export type ReviewDecision = "approve" | "deny";

export type ReviewClaimResult =
  | { status: "decided"; approved: boolean }
  | { status: "error"; message: string };

const decisionSchema = z.enum(["approve", "deny"]);

/** Approves or denies a request. The token from the email is the authorization. */
export async function reviewClaimRequest(
  requestId: string,
  token: string,
  decision: ReviewDecision,
): Promise<ReviewClaimResult> {
  if (
    !uuidSchema.safeParse(requestId).success ||
    typeof token !== "string" ||
    !token ||
    !decisionSchema.safeParse(decision).success
  ) {
    return { status: "error", message: "This review link is not valid." };
  }
  const request = await getClaimRequest(requestId);
  if (!request || !reviewTokenMatches(token, request.reviewTokenHash)) {
    return { status: "error", message: "This review link is not valid." };
  }
  if (request.status !== "PENDING") {
    return {
      status: "error",
      message: `This request was already ${request.status === "APPROVED" ? "approved" : "denied"}.`,
    };
  }
  if (!request.idea) {
    await decideClaimRequest(requestId, "DENIED");
    return { status: "error", message: "The idea no longer exists, so the request was closed." };
  }

  const origin = await requestOrigin();
  const requester = await requesterProfile(request.clerkUserId);
  const notify = (approved: boolean) =>
    requester.email
      ? sendClaimDecisionEmail({
          to: requester.email,
          origin,
          ideaId: request.ideaId,
          ideaName: request.idea?.name ?? "an idea",
          approved,
        }).catch(() => false)
      : Promise.resolve(false);

  if (decision === "deny") {
    const decided = await decideClaimRequest(requestId, "DENIED");
    if (!decided) {
      return { status: "error", message: "This request was already decided." };
    }
    await notify(false);
    revalidatePath(`/ideas/${request.ideaId}`);
    return { status: "decided", approved: false };
  }

  let claimed: boolean;
  try {
    claimed = await claimIdea(request.ideaId, request.clerkUserId);
  } catch (error) {
    console.error("Claim on approval failed", error);
    return { status: "error", message: "The claim could not be saved. Try again." };
  }
  if (!claimed) {
    const idea = await getIdea(request.ideaId, { clerkUserId: request.clerkUserId });
    const alreadyFounder = idea?.members.some(
      (member) => member.clerkUserId === request.clerkUserId && member.role === "FOUNDER",
    );
    if (!alreadyFounder) {
      await decideClaimRequest(requestId, "DENIED");
      return {
        status: "error",
        message: "Someone else already claimed this idea, so the request was closed.",
      };
    }
  }

  const decided = await decideClaimRequest(requestId, "APPROVED");
  if (!decided) {
    return { status: "error", message: "This request was already decided." };
  }
  await denyOtherClaimRequests(request.ideaId, requestId).catch(() => undefined);
  await notify(true);
  revalidateClaim(request.ideaId, await importedProjectIds(request.ideaId, request.clerkUserId));
  return { status: "decided", approved: true };
}
