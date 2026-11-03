import type { IdeaWithDetails } from "@westride/db/ideas";
import type { EvaluationWithFindings } from "@westride/db/idea-factory";
import type { IdeaFactoryArtifact, MuseFinding } from "@westride/db";
import { getAgent, type AgentDefinition } from "./agents";
import { artifactInstructions } from "./artifacts";
import { IDEA_TYPE_LABELS } from "@/lib/ideas/filters";

/** Keeps the shared context from swallowing the whole prompt budget. */
const MAX_FINDINGS_PER_AGENT = 6;
const MAX_HISTORY_MESSAGES = 30;
const MAX_ARTIFACTS_IN_CONTEXT = 40;

export const EVIDENCE_RULES = `Evidence discipline (always):
- Label every substantive claim with exactly one evidence class:
  VERIFIED = backed by a named source you found, with its date.
  ESTIMATE = derived from sources with the reasoning shown.
  ASSUMPTION = taken as given for now; the team should confirm it.
  HYPOTHESIS = your own generated idea; needs testing.
- When you use external research, cite the source (title, URL) and its date. Never fabricate sources, statistics, or quotes. If you cannot find something, say so and give a labelled estimate instead.
- Be specific to this idea, its geographies, and its type. Generic advice is a failure.
- Keep answers tight. Use headings and bullet lists; no filler, no preamble.`;

function ideaBrief(idea: IdeaWithDetails): string {
  const countries =
    idea.countries.length > 0
      ? idea.countries.map((country) => country.name).join(", ")
      : "not specified";
  const tags = idea.tags.length > 0 ? idea.tags.map((tag) => tag.name).join(", ") : "none";
  return `## The idea
Name: ${idea.name}
Type: ${IDEA_TYPE_LABELS[idea.type]}
Geographies: ${countries}
Tags: ${tags}
Team size: ${idea.members.length}

Description (written by the team, Markdown):
${idea.description.trim()}`;
}

function findingLine(finding: MuseFinding): string {
  const sources = finding.sources
    .map((source) => `${source.title ?? source.url}${source.date ? ` (${source.date})` : ""}`)
    .join("; ");
  return `- [${finding.evidenceClass}] ${finding.claim}${sources ? ` — sources: ${sources}` : ""}`;
}

function sharedContext(evaluation: EvaluationWithFindings | null): string {
  if (!evaluation) {
    return `## Shared team context
No evaluation has been run yet. The other specialists have not weighed in.`;
  }

  const sections = evaluation.findings
    .filter((finding) => finding.status === "COMPLETED")
    .map((finding) => {
      const agent = getAgent(finding.agentSlug);
      const lines = finding.findings.slice(0, MAX_FINDINGS_PER_AGENT).map(findingLine);
      return `### ${agent?.name ?? finding.agentSlug} — verdict: ${finding.verdict ?? "n/a"}
${finding.summary ?? ""}
${lines.join("\n")}`;
    });

  const synthesis = evaluation.synthesis
    ? `### Synthesis
${evaluation.synthesis.overview}
Open questions for the team: ${evaluation.synthesis.questionsForYou.join(" | ")}`
    : "";

  return `## Shared team context
From the evaluation completed ${evaluation.completedAt?.toISOString().slice(0, 10) ?? "recently"}. Build on it; disagree with it where you have reason to.

${sections.join("\n\n")}

${synthesis}`.trim();
}

/**
 * The files the team still has, so advisors build on the chosen logo rather
 * than proposing a fresh one. Archived files are never passed in.
 */
function filesContext(artifacts: IdeaFactoryArtifact[]): string {
  if (artifacts.length === 0) {
    return `## Files the team has
None yet.`;
  }
  const lines = artifacts.slice(0, MAX_ARTIFACTS_IN_CONTEXT).map((artifact) => {
    const agent = artifact.agentSlug ? getAgent(artifact.agentSlug) : undefined;
    const by = agent ? ` by ${agent.name}` : "";
    const chosen = artifact.chosenAt ? " [CHOSEN by the team]" : "";
    const note = artifact.description ? ` — ${artifact.description.slice(0, 200)}` : "";
    return `- ${artifact.kind.toLowerCase()} "${artifact.title}" in collection "${artifact.collection || "misc"}"${by} (${artifact.createdAt.toISOString().slice(0, 10)})${chosen}${note}`;
  });
  return `## Files the team has
Only files the team kept are listed. One marked CHOSEN is the version they want to move forward with.
${lines.join("\n")}`;
}

export function buildAgentInstructions(input: {
  agent: AgentDefinition;
  idea: IdeaWithDetails;
  latestEvaluation: EvaluationWithFindings | null;
  /** Active (not archived) files. Pass `null` when files are not available. */
  artifacts: IdeaFactoryArtifact[] | null;
  today: string;
}): string {
  const files =
    input.artifacts === null
      ? ""
      : `\n\n${artifactInstructions(Boolean(input.agent.createsImages))}\n\n${filesContext(input.artifacts)}`;
  return `You are one specialist on the AI Advisory Team inside WeStride's Idea Factory, helping a founding team develop an early-stage ${IDEA_TYPE_LABELS[input.idea.type].toLowerCase()} idea. Today is ${input.today}.

${input.agent.brief}

${EVIDENCE_RULES}

${ideaBrief(input.idea)}

${sharedContext(input.latestEvaluation)}${files}`;
}

export type HistoryMessage = {
  role: "USER" | "AGENT";
  content: string;
};

/** Converts the stored thread into Responses API input items. */
export function buildChatInput(
  history: HistoryMessage[],
): { role: "user" | "assistant"; content: string }[] {
  return history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role === "USER" ? "user" : "assistant",
    content: message.content,
  }));
}

// ---------------------------------------------------------------------------
// Evaluate my idea
// ---------------------------------------------------------------------------

export const EVALUATION_PROMPT = `Evaluate this idea from your specialist perspective for the team's "Evaluate my idea" review. Other specialists are evaluating it in parallel; a synthesis step will compare your findings with theirs, so be concrete and take a position.

Return:
- verdict: PROMISING if your area shows no serious obstacle, CAUTION if there are real risks the team must address, BLOCKER if something in your area could sink the idea as described.
- summary: one paragraph (Markdown allowed) a founder can read in twenty seconds.
- findings: four to eight specific findings, each with a one-line claim, a short detail, an evidence class, and sources where external research was used (title, URL, date).
- nextSteps: two to four concrete actions for the team.`;

const sourceSchema = {
  type: "object",
  properties: {
    url: { type: "string", description: "Absolute URL of the source." },
    title: { type: ["string", "null"], description: "Page or document title." },
    date: {
      type: ["string", "null"],
      description: "Publication or retrieval date, ISO 8601 (YYYY-MM-DD) when known.",
    },
  },
  required: ["url", "title", "date"],
  additionalProperties: false,
} as const;

export const EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["PROMISING", "CAUTION", "BLOCKER"] },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string", description: "One sentence." },
          detail: { type: "string", description: "Two to four sentences, Markdown allowed." },
          evidenceClass: {
            type: "string",
            enum: ["VERIFIED", "ESTIMATE", "ASSUMPTION", "HYPOTHESIS"],
          },
          sources: { type: "array", items: sourceSchema },
        },
        required: ["claim", "detail", "evidenceClass", "sources"],
        additionalProperties: false,
      },
    },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: ["verdict", "summary", "findings", "nextSteps"],
  additionalProperties: false,
} as const;

export const SYNTHESIS_INSTRUCTIONS = `You are Muse, the lead of the AI Advisory Team in WeStride's Idea Factory. Several specialists have just evaluated the same idea independently. Your job is to synthesise their findings for the founding team.

- Read every specialist's verdict and findings. Treat them as colleagues who may be right or wrong.
- Surface where they agree, and where they disagree or where one specialist's finding undermines another's (for example a promising market but unprofitable unit economics, or a regulatory barrier that changes the launch plan). Explain each disagreement and how the team could resolve it.
- Respect the evidence classes: weigh VERIFIED findings above ESTIMATE, and both above ASSUMPTION and HYPOTHESIS. Point out where a verdict rests on weak evidence.
- Finish with a clear recommendation and the two to four questions the team must answer next. Address the team directly as "you".
- Markdown is allowed inside strings. Be concise.`;

export const SYNTHESIS_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string", description: "Two or three paragraphs." },
    agreements: { type: "array", items: { type: "string" } },
    disagreements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          positions: {
            type: "string",
            description: "Who found what, naming the specialists.",
          },
          resolution: {
            type: "string",
            description: "How the team could settle it.",
          },
        },
        required: ["topic", "positions", "resolution"],
        additionalProperties: false,
      },
    },
    risks: { type: "array", items: { type: "string" } },
    recommendation: { type: "string" },
    questionsForYou: { type: "array", items: { type: "string" } },
  },
  required: [
    "overview",
    "agreements",
    "disagreements",
    "risks",
    "recommendation",
    "questionsForYou",
  ],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Suggested Build Studio projects
// ---------------------------------------------------------------------------

export const BUILD_SUGGESTION_KINDS = [
  "web",
  "mobile",
  "api",
  "worker",
  "library",
  "infrastructure",
  "docs",
  "other",
] as const;

export const BUILD_SUGGESTIONS_INSTRUCTIONS = `You are Muse, lead of the AI Advisory Team in WeStride's Idea Factory, preparing the handoff to WeStride's Build Studio, where each software project gets its own board, tickets, and GitHub repository, and coding agents work from the tickets.

Split what this idea needs built into separate Build Studio projects, one per repository.
- Think in deployable units: a web app, a mobile app, an API or backend, background workers, a shared library or SDK, infrastructure, documentation or marketing site. Merge things that would sensibly live in one repository; split things with different release cadences, runtimes, or teams.
- Prefer the smallest set that lets the team ship a first version. Two to five projects is typical; one is fine for a simple idea. Mark anything that can wait as a later project by putting it after the essentials and explaining in its description.
- For each project, write a description a coding agent could start from: what it is, its core user flows or responsibilities, the data it owns, integrations, the stack you recommend and why, and what is out of scope for version one. Markdown, under 2,500 characters.
- Suggest a repository name in lowercase-hyphenated form, and the first two to four milestones.
- Where projects already exist for this idea (listed below), do not suggest duplicates: reference them in dependsOn by their key, and only propose what is missing.
- Respect the advisors' findings: if the evaluation says to start with a landing page and waitlist, the first project is that, not the full platform.`;

export const BUILD_SUGGESTIONS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Two or three sentences on how you split the work and what you left for later.",
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Short stable key, lowercase-hyphenated, unique within this list.",
          },
          name: { type: "string", description: "Project name, under 60 characters." },
          repoName: { type: "string", description: "Lowercase, hyphenated, under 60 characters." },
          kind: { type: "string", enum: [...BUILD_SUGGESTION_KINDS] },
          summary: { type: "string", description: "One sentence." },
          description: { type: "string", description: "Markdown brief, under 2,500 characters." },
          stack: { type: "array", items: { type: "string" } },
          firstMilestones: { type: "array", items: { type: "string" } },
          dependsOn: {
            type: "array",
            items: { type: "string" },
            description: "Keys of projects in this list, or existing project keys, needed first.",
          },
        },
        required: [
          "key",
          "name",
          "repoName",
          "kind",
          "summary",
          "description",
          "stack",
          "firstMilestones",
          "dependsOn",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "projects"],
  additionalProperties: false,
} as const;

export type ExistingProjectSummary = {
  key: string;
  name: string;
  description: string;
  status: string;
  repos: string[];
};

export function buildSuggestionsInput(input: {
  idea: IdeaWithDetails;
  latestEvaluation: EvaluationWithFindings | null;
  existingProjects: ExistingProjectSummary[];
}): string {
  const existing =
    input.existingProjects.length > 0
      ? input.existingProjects
          .map(
            (project) =>
              `- key "${project.key}": ${project.name} (${project.status.toLowerCase()})${project.repos.length > 0 ? ` — repos: ${project.repos.join(", ")}` : ""}\n  ${project.description.slice(0, 400).replace(/\s+/g, " ")}`,
          )
          .join("\n")
      : "None yet.";
  return `${ideaBrief(input.idea)}

${sharedContext(input.latestEvaluation)}

## Build Studio projects that already exist for this idea
${existing}

Propose the Build Studio projects this idea needs.`;
}

export function buildSynthesisInput(evaluation: EvaluationWithFindings): string {
  const sections = evaluation.findings.map((finding) => {
    const agent = getAgent(finding.agentSlug);
    const name = agent?.name ?? finding.agentSlug;
    if (finding.status !== "COMPLETED") {
      return `## ${name}
Did not complete${finding.error ? `: ${finding.error}` : ""}.`;
    }
    return `## ${name} — verdict: ${finding.verdict}
${finding.summary}

Findings:
${finding.findings.map((item) => `${findingLine(item)}\n  ${item.detail}`).join("\n")}

Next steps proposed: ${finding.nextSteps.join("; ")}`;
  });

  return `Here are the specialists' independent evaluations. Synthesise them.

${sections.join("\n\n")}`;
}
