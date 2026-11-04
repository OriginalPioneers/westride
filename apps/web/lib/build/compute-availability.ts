import "server-only";

import type { ComputeTarget, Device } from "@westride/db";
import type { ProjectWithDetails } from "@westride/db/build";
import { getCloudBalanceMicros, getProviderPreference, getSandboxProvider } from "@westride/db/cloud";
import { listOnlineDevicesForUser, listOnlineSponsorDevicesForIdea } from "@westride/db/devices";
import { isCloudComputeConfigured } from "@/lib/cloud/config";
import { MIN_BALANCE_FOR_COMPUTE_MICROS, formatUsd, microsToDollars } from "@/lib/cloud/pricing";
import { hasMuseAccess, pickOwnSandboxProvider } from "@/lib/cloud/provider";
import { hasModalSandboxAccess } from "@/lib/modal/connection";
import { hasVercelSandboxAccess } from "@/lib/vercel/connection";
import { getAgentRunnerConfig, getVolunteerRunnerConfig } from "./agent/config";
import type { ComputeAvailability, ComputeDeviceOption } from "./compute-target";

function toOption(device: Device): ComputeDeviceOption {
  return { id: device.id, name: device.name, models: device.models, hasMetaKey: device.hasMetaKey };
}

/** A computer can take work when it has a Meta key or serves at least one Ollama model. */
function canWork(device: ComputeDeviceOption): boolean {
  return device.hasMetaKey || device.models.length > 0;
}

/**
 * What the run dialog needs to know about each place a run could go, for
 * one member on one project. Reads are cheap: no tokens are refreshed and
 * no secrets opened.
 */
export async function getComputeAvailability(
  clerkUserId: string,
  project: ProjectWithDetails,
): Promise<ComputeAvailability> {
  const sandboxesConfigured = getAgentRunnerConfig() !== null;
  const devicesConfigured = getVolunteerRunnerConfig() !== null;
  const cloudConfigured = isCloudComputeConfigured();

  const [balanceMicros, preference, vercel, modal, ownPreference, myDevices, sponsorDevices, museAccess] =
    await Promise.all([
      cloudConfigured ? getCloudBalanceMicros(clerkUserId) : Promise.resolve(0),
      cloudConfigured ? getProviderPreference(clerkUserId) : Promise.resolve<"OWN" | "WESTRIDE_CLOUD">("OWN"),
      hasVercelSandboxAccess(clerkUserId),
      hasModalSandboxAccess(clerkUserId),
      getSandboxProvider(clerkUserId),
      devicesConfigured ? listOnlineDevicesForUser(clerkUserId) : Promise.resolve<Device[]>([]),
      devicesConfigured && project.ideaId
        ? listOnlineSponsorDevicesForIdea(project.ideaId)
        : Promise.resolve<Device[]>([]),
      hasMuseAccess(clerkUserId),
    ]);

  // WeStride Cloud
  const cloudReady = sandboxesConfigured && cloudConfigured && balanceMicros >= MIN_BALANCE_FOR_COMPUTE_MICROS;
  const balanceLabel = cloudConfigured ? formatUsd(microsToDollars(balanceMicros)) : null;
  const cloud = {
    ready: cloudReady,
    reason: cloudReady
      ? null
      : !cloudConfigured || !sandboxesConfigured
        ? "WeStride Cloud compute is not offered on this server."
        : `Your balance is ${balanceLabel}; a sandbox needs at least ${formatUsd(microsToDollars(MIN_BALANCE_FOR_COMPUTE_MICROS))}. Add funds or redeem a code.`,
    balanceLabel,
  };

  // Local: the member's own linked computers
  const local = (() => {
    const devices = myDevices.map(toOption);
    const able = devices.filter(canWork);
    if (!devicesConfigured) {
      return { ready: false, reason: "Linked computers are not set up on this WeStride server.", devices };
    }
    if (devices.length === 0) {
      return {
        ready: false,
        reason: "None of your computers is online. Link one from WePledge™, or start the WeStride runner on one you have linked.",
        devices,
      };
    }
    if (able.length === 0) {
      return {
        ready: false,
        reason: "Your online computer has no Meta key on the runner and Ollama offers no models. Pull a model in Ollama or restart the runner with META_API_KEY.",
        devices,
      };
    }
    return { ready: true, reason: null, devices: able };
  })();

  // Sponsors: supporters' computers pledged to the project's idea
  const sponsors = (() => {
    const devices = sponsorDevices.map(toOption);
    const able = devices.filter(canWork);
    if (!devicesConfigured) {
      return { ready: false, reason: "Linked computers are not set up on this WeStride server.", devices };
    }
    if (!project.ideaId) {
      return {
        ready: false,
        reason: "Supporters pledge compute to ideas. Link this project to an idea to run on their computers.",
        devices,
      };
    }
    if (able.length === 0) {
      return {
        ready: false,
        reason: "No supporter's computer pledged to this idea is online right now.",
        devices,
      };
    }
    return { ready: true, reason: null, devices: able };
  })();

  // 3rd party: the member's own Vercel or Modal account
  const ownProvider = pickOwnSandboxProvider({ vercel, modal }, ownPreference);
  const provider: "Vercel" | "Modal" | null =
    ownProvider === "VERCEL" ? "Vercel" : ownProvider === "MODAL" ? "Modal" : null;
  const thirdPartyReady = sandboxesConfigured && provider !== null;
  const thirdParty = {
    ready: thirdPartyReady,
    reason: thirdPartyReady
      ? null
      : !sandboxesConfigured
        ? "Sandboxes are not set up on this WeStride server."
        : "Connect your Vercel or Modal account in Settings so the sandbox runs on your own plan.",
    provider,
  };

  // The default follows the member's standing preference, then whatever is ready.
  const order: ComputeTarget[] =
    preference === "WESTRIDE_CLOUD"
      ? ["WESTRIDE_CLOUD", "THIRD_PARTY", "LOCAL", "SPONSORS"]
      : ["THIRD_PARTY", "WESTRIDE_CLOUD", "LOCAL", "SPONSORS"];
  const readiness: Record<ComputeTarget, boolean> = {
    WESTRIDE_CLOUD: cloud.ready,
    THIRD_PARTY: thirdParty.ready,
    LOCAL: local.ready,
    SPONSORS: sponsors.ready,
  };
  const defaultTarget = order.find((target) => readiness[target]) ?? order[0]!;

  return { defaultTarget, cloud, local, sponsors, thirdParty, hasMuseAccess: museAccess };
}
