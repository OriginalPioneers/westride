import type { ComputeTarget } from "@westride/db";

/**
 * Where a Muse Code run for a ticket can execute. Shared by the run dialog
 * (client) and the server that starts the run; needs no database.
 */
export const COMPUTE_TARGETS = [
  "WESTRIDE_CLOUD",
  "LOCAL",
  "SPONSORS",
  "THIRD_PARTY",
] as const satisfies readonly ComputeTarget[];

export const COMPUTE_TARGET_LABELS: Record<ComputeTarget, string> = {
  WESTRIDE_CLOUD: "WeStride Cloud",
  LOCAL: "Local",
  SPONSORS: "Sponsors",
  THIRD_PARTY: "3rd party",
};

/** One line under each choice in the run dialog. */
export const COMPUTE_TARGET_DESCRIPTIONS: Record<ComputeTarget, string> = {
  WESTRIDE_CLOUD:
    "A sandbox on WeStride's own compute, paid from your WeStride Cloud balance. The model runs on WeStride's Meta key.",
  LOCAL:
    "One of your own computers running the WeStride runner, in a Docker container. Use a local Ollama model or the Meta key you set on the runner; nothing is charged.",
  SPONSORS:
    "A supporter's computer pledged to this project's idea. Public repositories only; the supporter's local model or Meta key does the work.",
  THIRD_PARTY:
    "A sandbox on your own Vercel or Modal account, billed to you by them. The model runs on your Meta account.",
};

/** Targets that run on a linked computer through the WeStride runner rather than in a sandbox. */
export function isDeviceTarget(target: ComputeTarget): target is "LOCAL" | "SPONSORS" {
  return target === "LOCAL" || target === "SPONSORS";
}

/**
 * Something a member can see about where runs may go: whether each target
 * can take a run right now, and why not when it cannot. Built on the server
 * (`lib/build/compute-availability.ts`) and handed to the run dialog.
 */
export type ComputeDeviceOption = {
  id: string;
  name: string;
  /** Ollama model tags the computer can serve. */
  models: string[];
  /** The runner has a Meta key set, so it can run Muse models too. */
  hasMetaKey: boolean;
};

export type ComputeTargetAvailability = {
  /** The member can start a run there right now. */
  ready: boolean;
  /** Why not, in a sentence, when `ready` is false. */
  reason: string | null;
};

export type ComputeAvailability = {
  /** The run dialog's default choice. */
  defaultTarget: ComputeTarget;
  cloud: ComputeTargetAvailability & { balanceLabel: string | null };
  local: ComputeTargetAvailability & { devices: ComputeDeviceOption[] };
  /** Public repositories only; the dialog checks the chosen repository itself. */
  sponsors: ComputeTargetAvailability & { devices: ComputeDeviceOption[] };
  thirdParty: ComputeTargetAvailability & { provider: "Vercel" | "Modal" | null };
  /** Whether the member's own Meta account (or a funded balance) can run the model for sandbox targets. */
  hasMuseAccess: boolean;
};

/** The Meta model choice the dialog shows for a device target when the device has a Meta key. */
export const DEVICE_META_KEY_OPTION = "__meta__";

/** Ollama model tags the given computers can serve, deduplicated, with the tags more computers have first. */
export function localModelsOf(devices: ComputeDeviceOption[]): string[] {
  const counts = new Map<string, number>();
  for (const device of devices) {
    for (const model of device.models) {
      counts.set(model, (counts.get(model) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([model]) => model);
}
