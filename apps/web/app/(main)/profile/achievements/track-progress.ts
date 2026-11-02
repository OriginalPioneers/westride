import { builderSteps } from "@westride/db/builder";
import { achievementCatalog, mainAchievementCatalog } from "@westride/db";
import {
  challengeCatalog,
  interests,
  learningAwards,
  type Interest,
  type Depth,
} from "@westride/db/challenges";
import type { LearningAttempt } from "@westride/db/learning";

type Attempt = Pick<
  LearningAttempt,
  | "challengeSlug"
  | "interest"
  | "depth"
  | "answer"
  | "feedback"
  | "revision"
  | "completedAt"
  | "createdAt"
>;
export type ChallengeSelection = {
  slug: string;
  interest: Interest;
  depth: Depth;
};
export type NextStep = {
  title: string;
  description: string;
  label: string;
  unlocks: string[];
  challenge?: ChallengeSelection;
  href?: string;
};
export const challengeMilestones = [
  { slug: "prompt-pilot", value: 1, label: "Prompt Pilot" },
  { slug: "three-for-three", value: 3, label: "Three for Three" },
  { slug: "on-a-roll", value: 6, label: "On a Roll" },
  { slug: "full-circle", value: 12, label: "Full Circle" },
] as const;
export const revisionMilestones = [
  { slug: "second-draft", value: 1, label: "Second Draft" },
  { slug: "thoughtful-revisions", value: 3, label: "Thoughtful Revisions" },
] as const;

export function milestoneHint(
  value: number,
  milestones: readonly { value: number; label: string }[],
  unit: string,
) {
  const next = milestones.find((m) => value < m.value);
  if (!next) return "All milestones earned. Keep exploring at your own pace.";
  const remaining = next.value - value;
  return `${remaining} more ${unit}${remaining === 1 ? "" : "s"} to ${next.label}.`;
}

export function trackProgress(
  attempts: readonly Attempt[],
  earned: ReadonlySet<string>,
  signedIn: boolean,
) {
  const valid = attempts.filter((a) =>
    challengeCatalog.some((c) => c.slug === a.challengeSlug),
  );
  const completed = new Set(
    valid.filter((a) => a.completedAt).map((a) => a.challengeSlug),
  );
  const revised = new Set(
    valid
      .filter((a) => a.feedback && a.revision.trim())
      .map((a) => a.challengeSlug),
  );
  const unfinished = valid
    .filter((a) => !a.completedAt)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const names = (slugs: string[]) =>
    achievementCatalog
      .filter((a) => slugs.includes(a.slug) && !earned.has(a.slug))
      .map((a) => a.name);
  const select = (a: Attempt): ChallengeSelection => ({
    slug: a.challengeSlug,
    interest: a.interest,
    depth: a.depth,
  });
  const completionStep = (
    selection: ChallengeSelection,
    resume?: Attempt,
  ): NextStep => {
    const challenge = challengeCatalog.find((c) => c.slug === selection.slug)!;
    const projected = {
      challengeSlug: selection.slug,
      interest: selection.interest,
      completedAt: new Date(0),
      feedback: null,
      revision: "",
    };
    return {
      title: resume ? `Continue ${challenge.name}` : challenge.name,
      description: resume?.feedback
        ? "Muse's feedback is ready. Try an improvement or finish to save your progress."
        : challenge.task,
      label: resume ? "Continue challenge" : "Start challenge",
      challenge: selection,
      unlocks: names(learningAwards([...valid, projected])),
    };
  };
  let next: NextStep;
  const missingChallenge = challengeCatalog.find((c) => !completed.has(c.slug));
  const missingInterest = (Object.keys(interests) as Interest[]).find(
    (interest) => !valid.some((a) => a.completedAt && a.interest === interest),
  );
  const revisionCandidate =
    valid.find((a) => a.feedback && !revised.has(a.challengeSlug)) ??
    valid.find((a) => !revised.has(a.challengeSlug));
  if (!signedIn) {
    next = {
      title: "Your first step starts here",
      description:
        "Sign in to save your progress, try a short challenge, and collect your first achievement.",
      label: "Sign in to start",
      href: "/sign-in",
      unlocks: ["First Step"],
    };
  } else if (unfinished[0]) {
    next = completionStep(select(unfinished[0]), unfinished[0]);
  } else if (missingChallenge) {
    next = completionStep({
      slug: missingChallenge.slug,
      interest: valid[valid.length - 1]?.interest ?? "games",
      depth: "simple",
    });
  } else if (missingInterest) {
    next = completionStep({
      slug: challengeCatalog[0].slug,
      interest: missingInterest,
      depth: "simple",
    });
    next.description = `Try a familiar challenge through a new lens: ${interests[missingInterest].toLowerCase()}.`;
  } else if (revised.size < 3 && revisionCandidate) {
    next = {
      title: "Give an answer a second look",
      description: revisionCandidate.feedback
        ? "Use Muse's saved feedback to make one useful improvement. No new feedback request needed."
        : "Revisit an answer, request Muse feedback, then save an improvement.",
      label: "Revisit answer",
      challenge: select(revisionCandidate),
      unlocks: names([
        ...(revised.size === 0 ? ["second-draft"] : []),
        ...(revised.size === 2 ? ["thoughtful-revisions"] : []),
      ]),
    };
  } else if (!earned.has("curious-cat")) {
    next = {
      title: "Find something new to learn",
      description:
        "Visit the Academy and explore a topic that catches your curiosity.",
      label: "Explore Academy",
      href: "/academy",
      unlocks: ["Curious Cat"],
    };
  } else if (
    earned.has("first-spark") &&
    builderSteps.some((step) => !earned.has(step.slug))
  ) {
    const step = builderSteps.find((item) => !earned.has(item.slug))!;
    next = { ...step, href: "/ideas", unlocks: names([step.slug]) };
  } else {
    next = {
      title: earned.has("first-spark")
        ? "Put your learning into an idea"
        : "Turn a spark into an idea",
      description: mainAchievementCatalog.every((a) => earned.has(a.slug))
        ? `All ${mainAchievementCatalog.length} earned. Take what you practiced into your next idea.`
        : "Capture an idea in Idea Studio. A private idea counts too.",
      label: "Open Idea Studio",
      href: "/ideas",
      unlocks: names(["first-spark"]),
    };
  }

  function state(slug: string) {
    if (earned.has(slug)) return "Earned";
    if (!signedIn) return "Sign in";
    if (
      builderSteps.some((step) => step.slug === slug) &&
      !earned.has("first-spark")
    )
      return "Needs an idea";
    const milestone = [...challengeMilestones, ...revisionMilestones].find(
      (m) => m.slug === slug,
    );
    if (milestone) {
      const isRevision = revisionMilestones.some((m) => m.slug === slug);
      if (isRevision && !valid.some((a) => a.feedback)) return "Needs feedback";
      if ((isRevision ? revised.size : completed.size) > 0)
        return "In progress";
    }
    const interest = (
      {
        "game-thinker": "games",
        "everyday-inventor": "everyday",
        "helping-hand": "helping",
      } as Partial<Record<string, string>>
    )[slug];
    if (
      unfinished.some(
        (a) => a.challengeSlug === slug || a.interest === interest,
      ) ||
      (slug === "prompt-pilot" && unfinished.length)
    )
      return "In progress";
    return "Ready";
  }
  function detail(slug: string) {
    if (state(slug) === "Needs an idea")
      return "Save your first idea in Idea Studio to get started.";
    const milestone = [...challengeMilestones, ...revisionMilestones].find(
      (m) => m.slug === slug,
    );
    if (milestone && !earned.has(slug)) {
      const isRevision = revisionMilestones.some((m) => m.slug === slug);
      const count = Math.min(
        isRevision ? revised.size : completed.size,
        milestone.value,
      );
      const unit = `${isRevision ? "revision" : "challenge"}${milestone.value === 1 ? "" : "s"}`;
      return `${count} of ${milestone.value} ${unit}${milestone.value - count === 1 ? " · Just one more!" : ""}${state(slug) === "Needs feedback" ? " · Get Muse feedback first." : ""}`;
    }
    const attempt = unfinished.find((a) => a.challengeSlug === slug);
    if (attempt && !earned.has(slug))
      return attempt.feedback
        ? "Feedback ready · Improve your answer or finish."
        : attempt.answer.trim()
          ? "Answer saved · Continue when you're ready."
          : "Challenge started · Your next step is waiting.";
    return undefined;
  }
  return { completed, revised, next, state, detail };
}
