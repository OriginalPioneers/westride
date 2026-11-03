import type { Device, PledgeStatus } from "@westride/db";
import type { PledgeWithIdea } from "@westride/db/support";
import { formatMicros } from "./schema";

export const PLEDGE_STATUS_LABEL: Record<PledgeStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  REVOKED: "Ended",
};

export const PLEDGE_STATUS_VARIANT: Record<PledgeStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  REVOKED: "neutral",
};

/** The cap and what has been used for a token pledge, or the jobs run for a compute pledge. */
export function pledgeDetail(pledge: PledgeWithIdea): string {
  if (pledge.kind === "COMPUTE") {
    return pledge.jobsTotal > 0 ? `${pledge.jobsTotal} job${pledge.jobsTotal === 1 ? "" : "s"} run` : "No jobs yet";
  }
  const cap =
    pledge.capMicros === null
      ? "No cap"
      : `${formatMicros(pledge.capMicros)} ${pledge.resetsMonthly ? "a month" : "one time"}`;
  const spent =
    pledge.capMicros !== null && pledge.resetsMonthly
      ? `${formatMicros(pledge.spentMicrosThisPeriod)} used this period`
      : `${formatMicros(pledge.spentMicrosTotal)} used`;
  return `${cap} · ${spent}`;
}

/** What the runner last reported about its machine. */
export function deviceDetail(device: Device): string {
  const parts: string[] = [];
  if (device.os || device.arch) parts.push([device.os, device.arch].filter(Boolean).join(" "));
  if (device.cpus) parts.push(`${device.cpus} CPU${device.cpus === 1 ? "" : "s"}`);
  if (device.memoryMb) parts.push(`${Math.round(device.memoryMb / 1024)} GB`);
  if (device.models.length > 0) parts.push(`${device.models.length} local model${device.models.length === 1 ? "" : "s"}`);
  if (device.hasMetaKey) parts.push("Meta key");
  if (device.jobsCompleted > 0) parts.push(`${device.jobsCompleted} job${device.jobsCompleted === 1 ? "" : "s"}`);
  return parts.join(" · ") || "Waiting for its first check-in";
}
