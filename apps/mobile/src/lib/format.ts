import type { TrackDifficulty } from "@westride/api-client";
import type { Tone } from "@/theme";

export const DIFFICULTY_LABEL: Record<TrackDifficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const DIFFICULTY_TONE: Record<TrackDifficulty, Tone> = {
  BEGINNER: "green",
  INTERMEDIATE: "blue",
  ADVANCED: "purple",
};

export function formatDuration(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return hours === 1 ? "1 hour" : `${value} hours`;
}

export function formatLessonCount(count: number): string {
  return count === 1 ? "1 lesson" : `${count} lessons`;
}
