import type { TicketStatus } from "./build-schema";

/** Every status, in board order. */
export const TICKET_STATUSES: readonly TicketStatus[] = [
  "BACKLOG",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
];

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

/** Statuses that count as work still to do. */
export const OPEN_TICKET_STATUSES: readonly TicketStatus[] = [
  "BACKLOG",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
];

const MAX_PREFIX = 4;

/**
 * A short code for ticket keys, from the project's name: "Neighborhood Tool
 * Library" reads as NTL, so its tickets are NTL-1, NTL-2, and so on. Names
 * without letters fall back to PRJ.
 */
export function projectKeyPrefix(name: string): string {
  const words = name
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => /\p{L}/u.test(word));
  const initials = words.map((word) => word[0]!).join("");
  const code =
    words.length >= 2
      ? initials
      : (words[0] ?? "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, MAX_PREFIX);
  const cleaned = code.toUpperCase().slice(0, MAX_PREFIX);
  return cleaned || "PRJ";
}

export function ticketKey(projectName: string, number: number): string {
  return `${projectKeyPrefix(projectName)}-${number}`;
}

export type TicketStatusChange = {
  status: TicketStatus;
  blockedReason: string | null;
  completedAt: Date | null;
};

/**
 * What a status move writes. Leaving BLOCKED clears the reason; entering
 * DONE stamps the completion time and leaving it clears the stamp. A move
 * to the same status keeps the existing completion time.
 */
export function ticketStatusChange(
  current: Pick<TicketStatusChange, "status" | "completedAt">,
  next: TicketStatus,
  blockedReason: string | null | undefined,
  now: Date = new Date(),
): TicketStatusChange {
  const reason = blockedReason?.trim() || null;
  if (next === "BLOCKED" && !reason) {
    throw new Error("Say what is blocking this ticket.");
  }
  let completedAt: Date | null = null;
  if (next === "DONE") {
    completedAt = current.status === "DONE" ? (current.completedAt ?? now) : now;
  }
  return {
    status: next,
    blockedReason: next === "BLOCKED" ? reason : null,
    completedAt,
  };
}

export type TicketCounts = Record<TicketStatus, number>;

export const EMPTY_TICKET_COUNTS: TicketCounts = {
  BACKLOG: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  BLOCKED: 0,
  DONE: 0,
};

export function totalTickets(counts: TicketCounts): number {
  return TICKET_STATUSES.reduce((sum, status) => sum + counts[status], 0);
}

/** Whole-number percent of tickets that are done. Zero tickets is zero. */
export function ticketProgressPercent(counts: TicketCounts): number {
  const total = totalTickets(counts);
  return total === 0 ? 0 : Math.round((counts.DONE / total) * 100);
}
