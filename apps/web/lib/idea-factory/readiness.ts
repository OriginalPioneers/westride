import type { IdeaFactoryFinding, MuseFindingVerdict } from "@westride/db";
import type { EvaluationWithFindings } from "@westride/db/idea-factory";

/**
 * A readiness read-out derived from an evaluation. It is a summary of the
 * advisors' verdicts and how well they are evidenced, not a model output, so
 * the same evaluation always scores the same and the number can be explained.
 *
 * Per advisor: the verdict sets the base (PROMISING 88, CAUTION 62,
 * BLOCKER 30) and the evidence mix nudges it by up to ±8: verified findings
 * push up, hypotheses pull down. Overall is the mean across advisors who
 * finished, pulled down further when any advisor found a blocker.
 */

const VERDICT_BASE: Record<MuseFindingVerdict, number> = {
  PROMISING: 88,
  CAUTION: 62,
  BLOCKER: 30,
};

const EVIDENCE_WEIGHT = {
  VERIFIED: 1,
  ESTIMATE: 0.5,
  ASSUMPTION: 0,
  HYPOTHESIS: -0.5,
} as const;

export type ReadinessBand = "high" | "promising" | "needs-work" | "blocked";

export const READINESS_BAND_LABELS: Record<ReadinessBand, string> = {
  high: "High potential",
  promising: "Promising",
  "needs-work": "Needs work",
  blocked: "Serious blockers",
};

export const READINESS_BAND_SUMMARIES: Record<ReadinessBand, string> = {
  high: "The advisors see strong demand, a workable model, and a clear path to a first version.",
  promising: "The advisors are broadly positive, with a few risks to settle before you commit.",
  "needs-work": "Several advisors raised real concerns. Work through them before building.",
  blocked: "At least one advisor found something that could sink the idea as described.",
};

export type AdvisorScore = {
  agentSlug: string;
  verdict: MuseFindingVerdict | null;
  /** 0–100, or null when the advisor did not finish. */
  score: number | null;
  verifiedShare: number;
};

export type Readiness = {
  /** 0–100, or null when no advisor finished. */
  score: number | null;
  band: ReadinessBand | null;
  advisors: AdvisorScore[];
  counts: Record<MuseFindingVerdict, number>;
  /** Finished advisors who see a path forward (PROMISING or CAUTION, no blocker). */
  recommending: number;
  finished: number;
  total: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scoreFinding(finding: IdeaFactoryFinding): AdvisorScore {
  if (finding.status !== "COMPLETED" || !finding.verdict) {
    return { agentSlug: finding.agentSlug, verdict: null, score: null, verifiedShare: 0 };
  }
  const items = finding.findings;
  const verified = items.filter((item) => item.evidenceClass === "VERIFIED").length;
  const verifiedShare = items.length > 0 ? verified / items.length : 0;
  const evidence =
    items.length > 0
      ? items.reduce((sum, item) => sum + EVIDENCE_WEIGHT[item.evidenceClass], 0) / items.length
      : 0;
  const score = Math.round(clamp(VERDICT_BASE[finding.verdict] + evidence * 8, 5, 98));
  return { agentSlug: finding.agentSlug, verdict: finding.verdict, score, verifiedShare };
}

export function bandFor(score: number): ReadinessBand {
  if (score >= 80) {
    return "high";
  }
  if (score >= 65) {
    return "promising";
  }
  if (score >= 45) {
    return "needs-work";
  }
  return "blocked";
}

export function readinessFor(evaluation: EvaluationWithFindings): Readiness {
  const advisors = evaluation.findings.map(scoreFinding);
  const scored = advisors.filter((advisor) => advisor.score !== null);
  const counts: Record<MuseFindingVerdict, number> = { PROMISING: 0, CAUTION: 0, BLOCKER: 0 };
  for (const advisor of scored) {
    if (advisor.verdict) {
      counts[advisor.verdict] += 1;
    }
  }
  if (scored.length === 0) {
    return {
      score: null,
      band: null,
      advisors,
      counts,
      recommending: 0,
      finished: 0,
      total: evaluation.findings.length,
    };
  }
  const mean = scored.reduce((sum, advisor) => sum + (advisor.score ?? 0), 0) / scored.length;
  // A single blocker matters more than the average lets on.
  const penalty = counts.BLOCKER > 0 ? 8 + 4 * (counts.BLOCKER - 1) : 0;
  const score = Math.round(clamp(mean - penalty, 5, 98));
  return {
    score,
    band: bandFor(score),
    advisors,
    counts,
    recommending: counts.PROMISING + counts.CAUTION,
    finished: scored.length,
    total: evaluation.findings.length,
  };
}

export type Takeaway = {
  tone: "success" | "warning" | "info";
  text: string;
};

const TAKEAWAY_MAX_CHARS = 160;

/**
 * Synthesis bullets often run to a paragraph. A takeaway is the first
 * sentence (or the bold lead-in, when the bullet opens with one), capped.
 */
export function brief(text: string, max = TAKEAWAY_MAX_CHARS): string {
  const trimmed = text.trim();
  const lead = /^\*\*([^*]+?)\*\*\s*[:—–-]?\s*([\s\S]*)$/.exec(trimmed);
  if (lead) {
    const [, title, rest] = lead;
    const firstSentence = rest.split(/(?<=[.!?])\s+/)[0] ?? "";
    const combined = firstSentence ? `**${title.trim()}** ${firstSentence}` : `**${title.trim()}**`;
    return cap(combined, max);
  }
  return cap(trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed, max);
}

function cap(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > max * 0.6 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

/** The three or four lines that sit beside the score. */
export function takeawaysFor(evaluation: EvaluationWithFindings, limit = 4): Takeaway[] {
  const synthesis = evaluation.synthesis;
  const takeaways: Takeaway[] = [];
  if (synthesis) {
    for (const item of synthesis.agreements.slice(0, 2)) {
      takeaways.push({ tone: "success", text: brief(item) });
    }
    for (const item of synthesis.risks.slice(0, 1)) {
      takeaways.push({ tone: "warning", text: brief(item) });
    }
    for (const item of synthesis.questionsForYou.slice(0, 1)) {
      takeaways.push({ tone: "info", text: brief(item) });
    }
  }
  if (takeaways.length < limit) {
    for (const finding of evaluation.findings) {
      if (takeaways.length >= limit) {
        break;
      }
      if (finding.status === "COMPLETED" && finding.verdict === "BLOCKER" && finding.findings[0]) {
        takeaways.push({ tone: "warning", text: brief(finding.findings[0].claim) });
      }
    }
  }
  return takeaways.slice(0, limit);
}
