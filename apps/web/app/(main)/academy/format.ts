import type { Track } from "@westride/db";

export const DIFFICULTY_LABEL: Record<Track["difficulty"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const DIFFICULTY_BADGE: Record<
  Track["difficulty"],
  "green" | "blue" | "purple"
> = {
  BEGINNER: "green",
  INTERMEDIATE: "blue",
  ADVANCED: "purple",
};

/** "45 min", "1 hour", "2.5 hours". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return hours === 1 ? "1 hour" : `${value} hours`;
}

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function trackPath(trackSlug: string): string {
  return `/academy/${trackSlug}`;
}

export function lessonPath(trackSlug: string, lessonSlug: string): string {
  return `/academy/${trackSlug}/${lessonSlug}`;
}

export function theaterPath(trackSlug: string, lessonSlug: string): string {
  return `/academy/${trackSlug}/${lessonSlug}/theater`;
}

/**
 * The 11-character video id from any YouTube URL shape (watch, youtu.be,
 * embed, shorts, live), or null when the URL is not a YouTube video.
 */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }
  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery && /^[A-Za-z0-9_-]{11}$/.test(fromQuery)) {
    return fromQuery;
  }
  const fromPath = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(parsed.pathname);
  return fromPath ? fromPath[1] : null;
}

/** Privacy-enhanced embed URL for a YouTube video id. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}
