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
