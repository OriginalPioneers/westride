import "server-only";
import { escapeHtml, sendEmail, sendTeamEmail } from "@/lib/email/resend";
import { claimReviewUrl } from "./review-token";

export type ClaimRequestNotice = {
  requestId: string;
  token: string;
  origin: string;
  ideaId: string;
  ideaName: string;
  repoFullName: string | null;
  repoUrl: string | null;
  requester: { name: string; email: string | null; clerkUserId: string };
  message: string;
};

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Tells the team someone wants to claim an imported idea, with links to decide. */
export async function sendClaimRequestEmail(notice: ClaimRequestNotice): Promise<boolean> {
  const reviewUrl = claimReviewUrl(notice.origin, notice.requestId, notice.token);
  const ideaUrl = `${notice.origin}/ideas/${notice.ideaId}`;
  const requester = notice.requester.email
    ? `${notice.requester.name} <${notice.requester.email}>`
    : notice.requester.name;
  const repoLine = notice.repoFullName
    ? `Repository: ${notice.repoFullName}${notice.repoUrl ? ` (${notice.repoUrl})` : ""}`
    : "Repository: none linked";

  const text = [
    `${notice.requester.name} is asking to claim "${notice.ideaName}" on WeStride.`,
    "",
    `Requester: ${requester}`,
    `Clerk user id: ${notice.requester.clerkUserId}`,
    repoLine,
    `Idea: ${ideaUrl}`,
    "",
    "Their message:",
    notice.message || "(none)",
    "",
    "Review, then approve or deny:",
    reviewUrl,
    "",
    "Approving makes them the founder of the idea and the owner of its project.",
    "The link works once. Anyone holding it can decide, so do not forward it.",
  ].join("\n");

  const html = `
    <p><strong>${escapeHtml(notice.requester.name)}</strong> is asking to claim
    <a href="${escapeHtml(ideaUrl)}">${escapeHtml(notice.ideaName)}</a> on WeStride.</p>
    <ul>
      <li>Requester: ${escapeHtml(requester)}</li>
      <li>Clerk user id: <code>${escapeHtml(notice.requester.clerkUserId)}</code></li>
      <li>${
        notice.repoFullName
          ? `Repository: <a href="${escapeHtml(notice.repoUrl ?? "")}">${escapeHtml(notice.repoFullName)}</a>`
          : "Repository: none linked"
      }</li>
    </ul>
    <p><strong>Their message</strong></p>
    ${notice.message ? paragraphs(notice.message) : "<p><em>(none)</em></p>"}
    <p><a href="${escapeHtml(reviewUrl)}">Review this request</a> to approve or deny it.</p>
    <p>Approving makes them the founder of the idea and the owner of its project.
    The link works once. Anyone holding it can decide, so do not forward it.</p>
  `;

  return sendTeamEmail({
    subject: `Claim request: ${notice.ideaName}`,
    text,
    html,
    replyTo: notice.requester.email ?? undefined,
  });
}

export type ClaimDecisionNotice = {
  to: string;
  origin: string;
  ideaId: string;
  ideaName: string;
  approved: boolean;
};

/** Lets the requester know what was decided. */
export async function sendClaimDecisionEmail(notice: ClaimDecisionNotice): Promise<boolean> {
  const ideaUrl = `${notice.origin}/ideas/${notice.ideaId}`;
  const text = notice.approved
    ? `Your request to claim "${notice.ideaName}" was approved. You are now its founder and the owner of its project.\n\n${ideaUrl}`
    : `Your request to claim "${notice.ideaName}" was not approved.\n\nIf you maintain the repository, connecting GitHub in Settings lets WeStride confirm that directly.\n\n${ideaUrl}`;
  const html = notice.approved
    ? `<p>Your request to claim <a href="${escapeHtml(ideaUrl)}">${escapeHtml(notice.ideaName)}</a> was approved. You are now its founder and the owner of its project.</p>`
    : `<p>Your request to claim <a href="${escapeHtml(ideaUrl)}">${escapeHtml(notice.ideaName)}</a> was not approved.</p><p>If you maintain the repository, connecting GitHub in Settings lets WeStride confirm that directly.</p>`;
  return sendEmail({
    to: [notice.to],
    subject: notice.approved
      ? `You now own ${notice.ideaName} on WeStride`
      : `About your claim request for ${notice.ideaName}`,
    text,
    html,
  });
}
