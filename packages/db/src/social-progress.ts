export const socialPlatforms = {
  facebook: {
    label: "Facebook",
    href: "https://www.facebook.com/",
    style: "A warm community update with one specific question.",
  },
  threads: {
    label: "Threads",
    href: "https://www.threads.com/",
    style: "A short conversational update with one clear idea.",
  },
  instagram: {
    label: "Instagram",
    href: "https://www.instagram.com/",
    style:
      "A caption to accompany a screenshot or short demo; do not claim to have seen an image.",
  },
} as const;
export type SocialPlatform = keyof typeof socialPlatforms;
export const socialMilestones = [
  ["post-maker", "Post Maker!", "Save your first post drafted with Muse."],
  ["hello-world", "Hello, World!", "Confirm your first published post."],
  [
    "triple-feature",
    "Triple Feature",
    "Confirm three different posts in one day.",
  ],
  [
    "seven-day-signal",
    "Seven-Day Signal",
    "Confirm at least one post each day for seven consecutive days.",
  ],
  [
    "across-the-feed",
    "Across the Feed",
    "Confirm posts on two different platforms.",
  ],
  [
    "audience-engaged",
    "Audience: Engaged!",
    "Record a useful reply or feedback on a post you shared.",
  ],
] as const;
export type SocialProgressPost = {
  generatedAt: Date | null;
  sharedAt: Date | null;
  sharedDay: string | null;
  platform: string;
  engagement: string | null;
};
export function dayInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function validTimeZone(value: string) {
  try {
    dayInZone(new Date(), value);
    return true;
  } catch {
    return false;
  }
}
export function sharedPostUrl(value: string, platform: SocialPlatform) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^(www\.|m\.)/, "");
    const hosts =
      platform === "facebook"
        ? ["facebook.com"]
        : platform === "threads"
          ? ["threads.com", "threads.net"]
          : ["instagram.com"];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hosts.includes(host)
    )
      return null;
    url.hostname = hosts[0];
    url.hash = "";
    // Keep only Facebook's post identity parameters; discard tracking variants.
    const identity = new URLSearchParams();
    if (platform === "facebook")
      for (const key of ["story_fbid", "id", "fbid", "v"]) {
        const value = url.searchParams.get(key);
        if (value) identity.set(key, value);
      }
    url.search = identity.toString();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    const postPath =
      platform === "threads"
        ? /\/@[^/]+\/post\/[^/]+/
        : platform === "instagram"
          ? /^\/(p|reel|tv)\/[^/]+/
          : /\/(posts|videos|reel|share)\/[^/]+|^\/(permalink|story|photo)\.php$/;
    if (!postPath.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function socialProgress(
  posts: readonly SocialProgressPost[],
  today: string,
) {
  const shared = posts.filter((p) => p.sharedAt && p.sharedDay);
  const days = [...new Set(shared.map((p) => p.sharedDay!))].sort();
  const countByDay = new Map<string, number>();
  for (const post of shared)
    countByDay.set(post.sharedDay!, (countByDay.get(post.sharedDay!) ?? 0) + 1);
  let bestStreak = 0,
    streak = 0,
    previous = 0;
  for (const day of days) {
    const date = Date.parse(day);
    streak = date - previous === 86400000 ? streak + 1 : 1;
    bestStreak = Math.max(bestStreak, streak);
    previous = date;
  }
  const currentStreak =
    days.length && Date.parse(today) - previous <= 86400000 ? streak : 0;
  const platformCount = new Set(shared.map((p) => p.platform)).size;
  const slugs: string[] = [];
  if (posts.some((p) => p.generatedAt)) slugs.push("post-maker");
  if (shared.length) slugs.push("hello-world");
  if ([...countByDay.values()].some((count) => count >= 3))
    slugs.push("triple-feature");
  if (bestStreak >= 7) slugs.push("seven-day-signal");
  if (platformCount >= 2) slugs.push("across-the-feed");
  if (shared.some((p) => p.engagement?.trim())) slugs.push("audience-engaged");
  return {
    slugs,
    todayCount: countByDay.get(today) ?? 0,
    currentStreak,
    bestStreak,
    platformCount,
    sharedCount: shared.length,
  };
}
