import "server-only";

import { randomBytes } from "node:crypto";
import type { ProjectRepo } from "@westride/db";
import type { ProjectWithDetails, TicketWithDetails } from "@westride/db/build";
import { ticketKey } from "@westride/db/build-rules";

/** A short, URL- and git-safe slug from a title. */
export function slugify(value: string, max = 40): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "work";
}

/**
 * `westride/gt-12-add-sign-in-k3f9a2`. The suffix keeps a second attempt
 * from colliding with a branch an earlier run already pushed.
 */
export function agentBranchName(projectName: string, ticket: TicketWithDetails): string {
  const key = ticketKey(projectName, ticket.number).toLowerCase();
  const suffix = randomBytes(3).toString("hex");
  return `westride/${key}-${slugify(ticket.title, 32)}-${suffix}`;
}

/**
 * The brief the agent works from. The ticket is the task; the rest is the
 * context a new teammate would want, and the rules the harness relies on.
 */
export function buildAgentPrompt(input: {
  project: ProjectWithDetails;
  ticket: TicketWithDetails;
  repo: ProjectRepo;
  branch: string;
  instructions: string;
}): string {
  const { project, ticket, repo, branch, instructions } = input;
  const key = ticketKey(project.name, ticket.number);
  const sections: string[] = [];

  sections.push(
    `# ${key}: ${ticket.title}`,
    "",
    "You are a Muse Code agent working for the WeStride team building the project below. Complete the ticket in this repository. You are on a fresh branch in a disposable sandbox with no one watching, so work autonomously: make reasonable decisions, note them in your final message, and do not wait for approval.",
    "",
    "## The ticket",
    "",
    ticket.description.trim() || "_(The ticket has no description. Infer the smallest useful change from the title, and say what you assumed.)_",
  );

  if (ticket.milestone) {
    sections.push("", `Milestone: ${ticket.milestone.title}`);
  }
  if (ticket.blockedReason) {
    sections.push("", `A previous attempt was roadblocked: ${ticket.blockedReason}`);
  }

  sections.push(
    "",
    "## The project",
    "",
    `**${project.name}** — ${project.description.trim()}`,
    "",
    `Repository: ${repo.owner}/${repo.name} (default branch \`${repo.defaultBranch}\`). You are on branch \`${branch}\`.`,
  );

  if (instructions.trim()) {
    sections.push("", "## Extra guidance from the team", "", instructions.trim());
  }

  sections.push(
    "",
    "## How to work",
    "",
    "1. Read the repository's own instructions first (AGENTS.md, CLAUDE.md, README, CONTRIBUTING) and follow its conventions, tooling, and test commands.",
    "2. Keep the change focused on this ticket. Do not refactor unrelated code or change tooling unless the ticket asks.",
    "3. Run the project's checks (typecheck, lint, tests) for the parts you touched. Fix what you broke. If a check cannot run in this environment, say so.",
    "4. Commit your work as you go with clear messages, on the current branch. Do not push, do not open pull requests, do not switch branches, and never rewrite history: the harness pushes and opens the pull request when you finish.",
    "5. Do not install global tools or touch files outside the repository.",
    "6. If the ticket cannot be done as written, do the parts that can be and explain exactly what is missing and why.",
    "",
    "## Your final message",
    "",
    "End with a short report for the pull request description, in Markdown, under these headings: **What changed**, **How to test**, **Decisions and open questions**. It will be posted to the ticket as-is.",
  );

  return sections.join("\n");
}
