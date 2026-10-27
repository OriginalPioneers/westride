export const ACHIEVEMENT_SLUG = {
  curiousCat: "curious-cat",
  newbie: "newbie",
} as const;

export type AchievementSlug =
  (typeof ACHIEVEMENT_SLUG)[keyof typeof ACHIEVEMENT_SLUG];

export type AchievementSeed = {
  slug: AchievementSlug;
  name: string;
  description: string;
  badgeUrl: string;
  sortOrder: number;
};

/**
 * Stand-in badge art. Replace each `badgeUrl` when the real graphic is ready.
 */
export const achievementCatalog = [
  {
    slug: ACHIEVEMENT_SLUG.curiousCat,
    name: "Curious Cat",
    description: "Entered the halls of the Academy.",
    badgeUrl: "/achievements/curious-cat.svg",
    sortOrder: 1,
  },
  {
    slug: ACHIEVEMENT_SLUG.newbie,
    name: "Newbie",
    description: "Created a WeStride account.",
    badgeUrl: "/achievements/newbie.svg",
    sortOrder: 2,
  },
] satisfies AchievementSeed[];
