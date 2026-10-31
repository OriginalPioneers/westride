import "server-only";

import { randomBytes } from "node:crypto";
import type { Agent, AgentTicket } from "@westride/db";
import { agentTicketKey } from "@westride/db/agent-rules";
import { slugify } from "@/lib/build/agent/prompt";

export type AgentPromptContext = {
  agent: Agent;
  ticket: AgentTicket;
  /** Extra guidance for this one job, on top of the agent's instructions. */
  instructions: string;
  idea: { name: string; description: string } | null;
  project: { name: string; description: string } | null;
};

/** `westride/agent-rb-3-weekly-digest-a1b2c3`. */
export function agentJobBranchName(agent: Agent, ticket: AgentTicket): string {
  const key = agentTicketKey(agent.name, ticket.number).toLowerCase();
  const suffix = randomBytes(3).toString("hex");
  return `westride/agent-${key}-${slugify(ticket.title, 32)}-${suffix}`;
}

function contextSections(input: AgentPromptContext): string[] {
  const { agent, idea, project, instructions } = input;
  const sections: string[] = [];
  sections.push(
    "",
    "## Who you are",
    "",
    `You are **${agent.name}**, an agent set up by a WeStride member. ${agent.description.trim()}`,
  );
  if (agent.instructions.trim()) {
    sections.push("", "### Standing instructions", "", agent.instructions.trim());
  }
  if (project) {
    sections.push("", "## The project", "", `**${project.name}** — ${project.description.trim()}`);
  }
  if (idea) {
    sections.push("", "## The idea", "", `**${idea.name}** — ${idea.description.trim()}`);
  }
  if (instructions.trim()) {
    sections.push("", "## Extra guidance for this job", "", instructions.trim());
  }
  return sections;
}

/**
 * The brief for a Muse Code job in the agent's repository. The ticket is
 * the task; the agent's own description and instructions set the persona.
 */
export function buildCodeJobPrompt(input: AgentPromptContext & { branch: string }): string {
  const { agent, ticket, branch } = input;
  const key = agentTicketKey(agent.name, ticket.number);
  const sections: string[] = [];

  sections.push(
    `# ${key}: ${ticket.title}`,
    "",
    "You are a Muse Code agent working in this repository on behalf of a WeStride member. Complete the ticket below. You are on a fresh branch in a disposable sandbox with no one watching, so work autonomously: make reasonable decisions, note them in your final message, and do not wait for approval.",
    "",
    "## The ticket",
    "",
    ticket.description.trim() ||
      "_(The ticket has no description. Infer the smallest useful change from the title, and say what you assumed.)_",
  );
  if (ticket.blockedReason) {
    sections.push("", `A previous attempt was roadblocked: ${ticket.blockedReason}`);
  }
  sections.push(...contextSections(input));
  sections.push(
    "",
    `Repository: ${agent.repoOwner}/${agent.repoName} (default branch \`${agent.repoDefaultBranch}\`). You are on branch \`${branch}\`.`,
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

/**
 * A report job is one Model API call with web search. The system
 * instructions carry the persona; the ticket is the user message.
 */
export function buildReportJobInstructions(input: AgentPromptContext): string {
  const sections: string[] = [
    "You are an agent set up by a WeStride member to do recurring research and writing. Answer the task you are given fully and directly, in Markdown. Use web search when the task needs current facts, and cite what you relied on. Do not ask questions back; make reasonable assumptions and state them at the end under **Assumptions**.",
  ];
  sections.push(...contextSections(input));
  return sections.join("\n");
}

export function buildReportJobInput(ticket: AgentTicket): string {
  const lines = [`# ${ticket.title}`, ""];
  lines.push(ticket.description.trim() || "_(No further detail was given. Do the most useful version of the task in the title.)_");
  if (ticket.blockedReason) {
    lines.push("", `A previous attempt did not finish: ${ticket.blockedReason}`);
  }
  return lines.join("\n");
}
