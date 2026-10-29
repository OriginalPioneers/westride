import { challengeCatalog } from "./challenge-catalog";
export const ACHIEVEMENT_SLUG = {
  curiousCat: "curious-cat",
  newbie: "newbie",
  firstSpark: "first-spark",
} as const;
export const achievementGroups = [
  "Getting started",
  "Communicate clearly",
  "Think like a builder",
  "Keep exploring",
] as const;
const milestones = [
  ["newbie", "First Step", "Sign in to start your journey.", "Getting started"],
  ["curious-cat", "Curious Cat", "Visit the Academy.", "Getting started"],
  [
    "first-spark",
    "First Spark",
    "Save your first idea, public or private.",
    "Getting started",
  ],
  [
    "prompt-pilot",
    "Prompt Pilot",
    "Complete your first challenge.",
    "Getting started",
  ],
  [
    "second-draft",
    "Second Draft",
    "Save a changed answer after Muse gives feedback.",
    "Getting started",
  ],
  [
    "three-for-three",
    "Three for Three",
    "Complete three different challenges.",
    "Getting started",
  ],
  [
    "game-thinker",
    "Game Thinker",
    "Complete a challenge about games.",
    "Keep exploring",
  ],
  [
    "everyday-inventor",
    "Everyday Inventor",
    "Complete a challenge about everyday life.",
    "Keep exploring",
  ],
  [
    "helping-hand",
    "Helping Hand",
    "Complete a challenge about helping people.",
    "Keep exploring",
  ],
  [
    "on-a-roll",
    "On a Roll",
    "Complete six different challenges.",
    "Keep exploring",
  ],
  [
    "full-circle",
    "Full Circle",
    "Complete all twelve challenges.",
    "Keep exploring",
  ],
  [
    "thoughtful-revisions",
    "Thoughtful Revisions",
    "Revise answers in three different challenges after Muse feedback.",
    "Keep exploring",
  ],
] as const;
export type AchievementSlug =
  (typeof milestones)[number][0] | (typeof challengeCatalog)[number]["slug"];
export const achievementCatalog = achievementGroups
  .flatMap((group) => [
    ...milestones
      .filter((m) => m[3] === group)
      .map(([slug, name, description]) => ({ slug, name, description, group })),
    ...challengeCatalog
      .filter((c) => c.group === group)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        description: `Complete the ${c.name} challenge.`,
        group,
      })),
  ])
  .map((item, sortOrder) => ({
    ...item,
    sortOrder,
    badgeUrl: `/achievements/${item.slug}.svg`,
  }));
export type AchievementSeed = (typeof achievementCatalog)[number];
