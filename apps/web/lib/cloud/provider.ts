import "server-only";

import type {
  CloudProviderPreference,
  ComputeSource,
  MuseKeySource,
  OwnSandboxProvider,
} from "@westride/db";
import { getCloudBalanceMicros, getProviderPreference, getSandboxProvider } from "@westride/db/cloud";
import { getMetaConnectionSummary, getMuseApiKey } from "../meta/connection";
import type { ModalCredentials } from "../modal/client";
import { getModalSandboxCredentials, hasModalSandboxAccess } from "../modal/connection";
import {
  getVercelSandboxCredentials,
  hasVercelSandboxAccess,
  type VercelSandboxCredentials,
} from "../vercel/connection";
import {
  getCloudMetaApiKey,
  getModalConfig,
  isCloudAiConfigured,
  isCloudComputeConfigured,
} from "./config";
import { MIN_BALANCE_FOR_AI_MICROS, MIN_BALANCE_FOR_COMPUTE_MICROS } from "./pricing";

/**
 * Every place that used to ask for the member's own Meta key or Vercel
 * account now asks here. The answer is the member's own connection when
 * they have one and want it, and WeStride Cloud when they prefer it or have
 * nothing else; either way the member can switch in Settings.
 *
 * The member whose preference and balance decide is the payer, which is
 * the sponsor for a sponsored job, so the Clerk id here is theirs.
 */

// ---------------------------------------------------------------------------
// Meta models
// ---------------------------------------------------------------------------

export type MuseAccess = {
  apiKey: string;
  source: MuseKeySource;
  /** Whose key, or whose balance, this is. */
  clerkUserId: string;
};

export type MuseAccessResult =
  | { ok: true; access: MuseAccess }
  | { ok: false; message: string; needs: "meta" };

const AI_SETTINGS_HINT = "Connect your Meta account in Settings";

function aiRefusal(hasCloud: boolean, balanceMicros: number | null): MuseAccessResult {
  if (!hasCloud) {
    return { ok: false, needs: "meta", message: `${AI_SETTINGS_HINT} to run Muse.` };
  }
  if (balanceMicros !== null && balanceMicros < MIN_BALANCE_FOR_AI_MICROS) {
    return {
      ok: false,
      needs: "meta",
      message: `Your WeStride Cloud balance is too low to run Muse. Add funds, or ${AI_SETTINGS_HINT.toLowerCase()}.`,
    };
  }
  return {
    ok: false,
    needs: "meta",
    message: `${AI_SETTINGS_HINT}, or add funds to WeStride Cloud, to run Muse.`,
  };
}

export async function resolveMuseAccess(clerkUserId: string): Promise<MuseAccessResult> {
  const cloudKey = getCloudMetaApiKey();
  const [preference, ownKey] = await Promise.all([
    cloudKey ? getProviderPreference(clerkUserId) : Promise.resolve<CloudProviderPreference>("OWN"),
    getMuseApiKey(clerkUserId),
  ]);
  const own: MuseAccess | null = ownKey ? { apiKey: ownKey, source: "OWN", clerkUserId } : null;
  if (!cloudKey) {
    return own ? { ok: true, access: own } : aiRefusal(false, null);
  }
  if (preference === "OWN" && own) {
    return { ok: true, access: own };
  }
  const balance = await getCloudBalanceMicros(clerkUserId);
  if (balance >= MIN_BALANCE_FOR_AI_MICROS) {
    return { ok: true, access: { apiKey: cloudKey, source: "WESTRIDE_CLOUD", clerkUserId } };
  }
  if (own) {
    return { ok: true, access: own };
  }
  return aiRefusal(true, balance);
}

/**
 * Muse access with the source the member's compute choice implies, rather
 * than their standing preference: a WeStride Cloud run prefers WeStride's
 * key against their balance, a run on their own accounts prefers their own
 * key. Either falls back to the other route when the preferred one cannot.
 */
export async function resolveMuseAccessFor(
  clerkUserId: string,
  prefer: MuseKeySource,
): Promise<MuseAccessResult> {
  const cloudKey = getCloudMetaApiKey();
  const ownKey = await getMuseApiKey(clerkUserId);
  const own: MuseAccess | null = ownKey ? { apiKey: ownKey, source: "OWN", clerkUserId } : null;
  if (!cloudKey) {
    return own ? { ok: true, access: own } : aiRefusal(false, null);
  }
  const balance = await getCloudBalanceMicros(clerkUserId);
  const cloud: MuseAccess | null =
    balance >= MIN_BALANCE_FOR_AI_MICROS ? { apiKey: cloudKey, source: "WESTRIDE_CLOUD", clerkUserId } : null;
  const first = prefer === "WESTRIDE_CLOUD" ? cloud : own;
  const second = prefer === "WESTRIDE_CLOUD" ? own : cloud;
  const access = first ?? second;
  return access ? { ok: true, access } : aiRefusal(true, balance);
}

/**
 * Whether Muse can run for this member right now, by any route. Cheaper
 * than resolving: it never re-mints a Meta key.
 */
export async function hasMuseAccess(clerkUserId: string): Promise<boolean> {
  if (await getMetaConnectionSummary(clerkUserId)) {
    return true;
  }
  if (!isCloudAiConfigured()) {
    return false;
  }
  const balance = await getCloudBalanceMicros(clerkUserId);
  return balance >= MIN_BALANCE_FOR_AI_MICROS;
}

// ---------------------------------------------------------------------------
// Sandboxes
// ---------------------------------------------------------------------------

/**
 * Where a sandbox runs and whose account it is on. `kind` is the API that
 * drives it (and later stops it); `source` is who pays: OWN work is billed
 * by Vercel or Modal directly to the member, WESTRIDE_CLOUD to their balance.
 */
export type SandboxAccess =
  | {
      kind: "VERCEL_SANDBOX";
      source: "OWN";
      credentials: VercelSandboxCredentials;
      clerkUserId: string;
    }
  | { kind: "MODAL_SANDBOX"; source: ComputeSource; credentials: ModalCredentials; clerkUserId: string };

export type SandboxAccessResult =
  | { ok: true; access: SandboxAccess }
  | { ok: false; message: string; needs: "compute" };

const COMPUTE_SETTINGS_HINT = "Connect your Vercel or Modal account in Settings";

function computeRefusal(hasCloud: boolean, balanceMicros: number | null): SandboxAccessResult {
  if (!hasCloud) {
    return {
      ok: false,
      needs: "compute",
      message: `${COMPUTE_SETTINGS_HINT} so the sandbox runs on your own plan.`,
    };
  }
  if (balanceMicros !== null && balanceMicros < MIN_BALANCE_FOR_COMPUTE_MICROS) {
    return {
      ok: false,
      needs: "compute",
      message: `Your WeStride Cloud balance is too low to start a sandbox. Add funds, or ${COMPUTE_SETTINGS_HINT.toLowerCase()}.`,
    };
  }
  return {
    ok: false,
    needs: "compute",
    message: `${COMPUTE_SETTINGS_HINT}, or add funds to WeStride Cloud, to run a sandbox.`,
  };
}

/**
 * Which of the member's own accounts would host a sandbox: the one they
 * chose (or connected last) when both are connected, else whichever exists.
 */
export function pickOwnSandboxProvider(
  available: { vercel: boolean; modal: boolean },
  preference: OwnSandboxProvider | null,
): OwnSandboxProvider | null {
  if (available.vercel && available.modal) {
    return preference ?? "MODAL";
  }
  return available.modal ? "MODAL" : available.vercel ? "VERCEL" : null;
}

/** The member's own sandbox host, with credentials, or null when they have none connected. */
async function resolveOwnSandboxAccess(clerkUserId: string): Promise<SandboxAccess | null> {
  const [vercel, modal, preference] = await Promise.all([
    getVercelSandboxCredentials(clerkUserId),
    getModalSandboxCredentials(clerkUserId),
    getSandboxProvider(clerkUserId),
  ]);
  const provider = pickOwnSandboxProvider({ vercel: vercel !== null, modal: modal !== null }, preference);
  if (provider === "MODAL" && modal) {
    return { kind: "MODAL_SANDBOX", source: "OWN", credentials: modal, clerkUserId };
  }
  if (provider === "VERCEL" && vercel) {
    return { kind: "VERCEL_SANDBOX", source: "OWN", credentials: vercel, clerkUserId };
  }
  return null;
}

/** WeStride Cloud's own Modal account, for sandboxes billed to a balance. */
function cloudSandboxAccess(clerkUserId: string): SandboxAccess {
  const config = getModalConfig();
  if (!config) {
    throw new Error("WeStride Cloud compute is not configured on this server.");
  }
  return {
    kind: "MODAL_SANDBOX",
    source: "WESTRIDE_CLOUD",
    clerkUserId,
    credentials: {
      tokenId: config.tokenId,
      tokenSecret: config.tokenSecret,
      // WeStride's own workspace, so the SDK's fallback to MODAL_ENVIRONMENT is right.
      environment: config.environment,
      appName: config.appName,
    },
  };
}

export async function resolveSandboxAccess(clerkUserId: string): Promise<SandboxAccessResult> {
  const hasCloud = isCloudComputeConfigured();
  const [preference, own] = await Promise.all([
    hasCloud ? getProviderPreference(clerkUserId) : Promise.resolve<CloudProviderPreference>("OWN"),
    resolveOwnSandboxAccess(clerkUserId),
  ]);
  if (!hasCloud) {
    return own ? { ok: true, access: own } : computeRefusal(false, null);
  }
  if (preference === "OWN" && own) {
    return { ok: true, access: own };
  }
  const balance = await getCloudBalanceMicros(clerkUserId);
  if (balance >= MIN_BALANCE_FOR_COMPUTE_MICROS) {
    return { ok: true, access: cloudSandboxAccess(clerkUserId) };
  }
  if (own) {
    return { ok: true, access: own };
  }
  return computeRefusal(true, balance);
}

/**
 * The sandbox for a target the member chose explicitly, rather than the
 * preference order above: WESTRIDE_CLOUD needs a funded balance and a server
 * that offers compute; THIRD_PARTY needs their own Vercel or Modal account.
 */
export async function resolveSandboxAccessFor(
  clerkUserId: string,
  target: "WESTRIDE_CLOUD" | "THIRD_PARTY",
): Promise<SandboxAccessResult> {
  if (target === "WESTRIDE_CLOUD") {
    if (!isCloudComputeConfigured()) {
      return {
        ok: false,
        needs: "compute",
        message: "WeStride Cloud compute is not offered on this server. Choose another place to run.",
      };
    }
    const balance = await getCloudBalanceMicros(clerkUserId);
    if (balance < MIN_BALANCE_FOR_COMPUTE_MICROS) {
      return {
        ok: false,
        needs: "compute",
        message: "Your WeStride Cloud balance is too low to start a sandbox. Add funds, or choose another place to run.",
      };
    }
    return { ok: true, access: cloudSandboxAccess(clerkUserId) };
  }
  const own = await resolveOwnSandboxAccess(clerkUserId);
  if (!own) {
    return {
      ok: false,
      needs: "compute",
      message: `${COMPUTE_SETTINGS_HINT} to run the sandbox on your own plan, or choose another place to run.`,
    };
  }
  return { ok: true, access: own };
}

/**
 * Whether a sandbox could start for this member right now, by any route.
 * Cheaper than resolving: it never refreshes a Vercel token or opens a secret.
 */
export async function hasSandboxAccess(clerkUserId: string): Promise<boolean> {
  const [vercel, modal] = await Promise.all([
    hasVercelSandboxAccess(clerkUserId),
    hasModalSandboxAccess(clerkUserId),
  ]);
  if (vercel || modal) {
    return true;
  }
  if (!isCloudComputeConfigured()) {
    return false;
  }
  const balance = await getCloudBalanceMicros(clerkUserId);
  return balance >= MIN_BALANCE_FOR_COMPUTE_MICROS;
}

// ---------------------------------------------------------------------------
// Summary for Settings and the Cloud page
// ---------------------------------------------------------------------------

export type CloudStatus = {
  balanceMicros: number;
  preference: CloudProviderPreference;
  /** Whether this server offers WeStride Cloud at all. */
  aiAvailable: boolean;
  computeAvailable: boolean;
  /** Whether the balance covers at least one call or one sandbox start. */
  canRunAi: boolean;
  canRunCompute: boolean;
};

export async function getCloudStatus(clerkUserId: string): Promise<CloudStatus> {
  const [balanceMicros, preference] = await Promise.all([
    getCloudBalanceMicros(clerkUserId),
    getProviderPreference(clerkUserId),
  ]);
  const aiAvailable = isCloudAiConfigured();
  const computeAvailable = isCloudComputeConfigured();
  return {
    balanceMicros,
    preference,
    aiAvailable,
    computeAvailable,
    canRunAi: aiAvailable && balanceMicros >= MIN_BALANCE_FOR_AI_MICROS,
    canRunCompute: computeAvailable && balanceMicros >= MIN_BALANCE_FOR_COMPUTE_MICROS,
  };
}
