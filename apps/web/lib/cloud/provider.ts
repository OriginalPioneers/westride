import "server-only";

import type { CloudProviderPreference, MuseKeySource } from "@westride/db";
import { getCloudBalanceMicros, getProviderPreference } from "@westride/db/cloud";
import { getMetaConnectionSummary, getMuseApiKey } from "../meta/connection";
import {
  getVercelSandboxCredentials,
  hasVercelSandboxAccess,
  type VercelSandboxCredentials,
} from "../vercel/connection";
import { getCloudMetaApiKey, isCloudAiConfigured, isCloudComputeConfigured } from "./config";
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

export type SandboxAccess =
  | { kind: "VERCEL_SANDBOX"; credentials: VercelSandboxCredentials; clerkUserId: string }
  | { kind: "MODAL_SANDBOX"; clerkUserId: string };

export type SandboxAccessResult =
  | { ok: true; access: SandboxAccess }
  | { ok: false; message: string; needs: "vercel" };

const COMPUTE_SETTINGS_HINT = "Connect your Vercel account in Settings";

function computeRefusal(hasCloud: boolean, balanceMicros: number | null): SandboxAccessResult {
  if (!hasCloud) {
    return {
      ok: false,
      needs: "vercel",
      message: `${COMPUTE_SETTINGS_HINT} so the sandbox runs on your Vercel plan.`,
    };
  }
  if (balanceMicros !== null && balanceMicros < MIN_BALANCE_FOR_COMPUTE_MICROS) {
    return {
      ok: false,
      needs: "vercel",
      message: `Your WeStride Cloud balance is too low to start a sandbox. Add funds, or ${COMPUTE_SETTINGS_HINT.toLowerCase()}.`,
    };
  }
  return {
    ok: false,
    needs: "vercel",
    message: `${COMPUTE_SETTINGS_HINT}, or add funds to WeStride Cloud, to run a sandbox.`,
  };
}

export async function resolveSandboxAccess(clerkUserId: string): Promise<SandboxAccessResult> {
  const hasCloud = isCloudComputeConfigured();
  const [preference, credentials] = await Promise.all([
    hasCloud ? getProviderPreference(clerkUserId) : Promise.resolve<CloudProviderPreference>("OWN"),
    getVercelSandboxCredentials(clerkUserId),
  ]);
  const own: SandboxAccess | null = credentials
    ? { kind: "VERCEL_SANDBOX", credentials, clerkUserId }
    : null;
  if (!hasCloud) {
    return own ? { ok: true, access: own } : computeRefusal(false, null);
  }
  if (preference === "OWN" && own) {
    return { ok: true, access: own };
  }
  const balance = await getCloudBalanceMicros(clerkUserId);
  if (balance >= MIN_BALANCE_FOR_COMPUTE_MICROS) {
    return { ok: true, access: { kind: "MODAL_SANDBOX", clerkUserId } };
  }
  if (own) {
    return { ok: true, access: own };
  }
  return computeRefusal(true, balance);
}

/**
 * Whether a sandbox could start for this member right now, by any route.
 * Cheaper than resolving: it never refreshes a Vercel token.
 */
export async function hasSandboxAccess(clerkUserId: string): Promise<boolean> {
  if (await hasVercelSandboxAccess(clerkUserId)) {
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
