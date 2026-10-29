import { changedPitch } from "./builder-progress";
export const interests = {
  games: "Games",
  everyday: "Everyday life",
  helping: "Helping people",
} as const;
export type Interest = keyof typeof interests;
export type Depth = "simple" | "deeper";
export const challengeCatalog = [
  {
    slug: "clear-intent",
    name: "Clear Intent",
    group: "Communicate clearly",
    task: "Write a request to AI that names your goal and what a useful answer would look like.",
  },
  {
    slug: "context-counts",
    name: "Context Counts",
    group: "Communicate clearly",
    task: "Write a request to AI. Include who it is for and two details that would help it answer.",
  },
  {
    slug: "step-by-step",
    name: "Step by Step",
    group: "Communicate clearly",
    task: "Explain a small task in three steps that someone else could follow.",
  },
  {
    slug: "set-the-boundaries",
    name: "Set the Boundaries",
    group: "Communicate clearly",
    task: "Ask AI for help with a task. Give it two useful limits, such as time, materials, or answer length.",
  },
  {
    slug: "teach-it-back",
    name: "Teach It Back",
    group: "Communicate clearly",
    task: "Explain something you know in your own words, then give a small example for someone new to it.",
  },
  {
    slug: "ask-for-evidence",
    name: "Ask for Evidence",
    group: "Communicate clearly",
    task: "Write a claim an AI might make. Describe what evidence you would look for before trusting it.",
  },
  {
    slug: "problem-finder",
    name: "Problem Finder",
    group: "Think like a builder",
    task: "Describe a small problem you have noticed. What happens, and why is it frustrating?",
  },
  {
    slug: "people-first",
    name: "People First",
    group: "Think like a builder",
    task: "Describe an idea, who it would help, and one thing those people need. Use imaginary people, not personal details.",
  },
  {
    slug: "what-if",
    name: "What If?",
    group: "Think like a builder",
    task: "Think of something familiar. Change one rule or assumption and describe a new possibility.",
  },
  {
    slug: "two-ways",
    name: "Two Ways",
    group: "Think like a builder",
    task: "Describe a small problem and two different ways to approach it. What is one tradeoff?",
  },
  {
    slug: "start-small",
    name: "Start Small",
    group: "Think like a builder",
    task: "Describe an idea and the smallest version you could try. What would you learn from trying it?",
  },
  {
    slug: "human-in-charge",
    name: "Human in Charge",
    group: "Think like a builder",
    task: "Imagine AI suggests making your project bigger and adding more features. Decide what to keep or reject, and explain your choice.",
  },
] as const;
export type ChallengeSlug = (typeof challengeCatalog)[number]["slug"];
export function challengePrompt(
  slug: string,
  interest: Interest,
  depth: Depth,
): string {
  const challenge = challengeCatalog.find((item) => item.slug === slug);
  if (!challenge) throw new Error("Unknown challenge");
  const context = {
    games: "Use a game you could play with paper or imagination.",
    everyday:
      "Use an everyday task, like organizing supplies or planning a meal.",
    helping: "Use a small way to help a person, animal, or your neighborhood.",
  }[interest];
  return `${challenge.task} ${context} ${depth === "simple" ? "A few short sentences are enough. A grown-up can help you write." : "Include your reasoning and one limitation or tradeoff."}`;
}
export type ChallengeProgress = {
  challengeSlug: string;
  interest: string;
  completedAt: Date | string | null;
  revision: string;
  feedback: unknown;
};
export function learningAwards(attempts: ChallengeProgress[]): string[] {
  const finished = attempts.filter((a) => a.completedAt);
  const slugs = new Set(
    finished
      .map((a) => a.challengeSlug)
      .filter((slug) => challengeCatalog.some((c) => c.slug === slug)),
  );
  const revised = new Set(
    attempts
      .filter((a) => a.feedback && a.revision.trim())
      .map((a) => a.challengeSlug),
  );
  const earned = [...slugs];
  if (slugs.size >= 1) earned.push("prompt-pilot");
  if (slugs.size >= 3) earned.push("three-for-three");
  if (slugs.size >= 6) earned.push("on-a-roll");
  if (slugs.size === challengeCatalog.length) earned.push("full-circle");
  if (revised.size >= 1) earned.push("second-draft");
  if (revised.size >= 3) earned.push("thoughtful-revisions");
  for (const [interest, badge] of Object.entries({
    games: "game-thinker",
    everyday: "everyday-inventor",
    helping: "helping-hand",
  })) {
    if (finished.some((a) => a.interest === interest)) earned.push(badge);
  }
  return earned;
}
// Same rule as Idea Studio: casing, spacing, and punctuation edits aren't revisions.
export function isChangedAnswer(answer: string, revision: string): boolean {
  return changedPitch(answer, revision);
}
