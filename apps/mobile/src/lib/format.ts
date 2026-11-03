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

export function excerpt(markdown: string, max = 140): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>~\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

const RELATIVE_UNITS = [
  { limit: 60, seconds: 1, unit: "second" },
  { limit: 3_600, seconds: 60, unit: "minute" },
  { limit: 86_400, seconds: 3_600, unit: "hour" },
  { limit: 2_592_000, seconds: 86_400, unit: "day" },
  { limit: Number.POSITIVE_INFINITY, seconds: 2_592_000, unit: "month" },
] as const;

type RelativeUnit = (typeof RELATIVE_UNITS)[number]["unit"];

/** English phrases matching Intl.RelativeTimeFormat numeric "auto". Device Hermes often omits that constructor. */
function formatRelativeUnit(value: number, unit: RelativeUnit): string {
  if (unit === "second" && value === 0) {
    return "now";
  }
  if (unit === "day") {
    if (value === -1) {
      return "yesterday";
    }
    if (value === 0) {
      return "today";
    }
    if (value === 1) {
      return "tomorrow";
    }
  }
  if (unit === "month") {
    if (value === -1) {
      return "last month";
    }
    if (value === 0) {
      return "this month";
    }
    if (value === 1) {
      return "next month";
    }
  }
  const abs = Math.abs(value);
  const label = abs === 1 ? unit : `${unit}s`;
  return value < 0 ? `${abs} ${label} ago` : `in ${abs} ${label}`;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return iso;
  }
  const deltaSeconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(deltaSeconds);
  const match = RELATIVE_UNITS.find((entry) => abs < entry.limit) ?? RELATIVE_UNITS[4];
  return formatRelativeUnit(Math.round(deltaSeconds / match.seconds), match.unit);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
