"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deviceClientId,
  listMuseModels,
  mintApiKey,
  MuseError,
  pollDeviceAuthorization,
  startDeviceAuthorization,
} from "@/lib/idea-factory/muse";
import {
  disconnectMetaAccount,
  isMetaConnectionConfigured,
  saveMetaAccount,
  saveMetaApiKey,
  type MetaConnectionSummary,
} from "@/lib/meta/connection";

type Failure = { status: "error"; message: string };

function failure(message: string): Failure {
  return { status: "error", message };
}

const NOT_CONFIGURED = "Connecting Meta is not set up on this WeStride server yet.";
const apiKeySchema = z.string().trim().min(8).max(512);

export type ConnectStart = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalSeconds: number;
  expiresInSeconds: number;
};

export async function startMetaConnect(): Promise<
  { status: "ok"; start: ConnectStart } | Failure
> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  if (!isMetaConnectionConfigured()) {
    return failure(NOT_CONFIGURED);
  }
  const clientId = deviceClientId();
  if (!clientId) {
    return failure("Connecting a Meta account is not configured. Paste an API key instead.");
  }
  try {
    const start = await startDeviceAuthorization(clientId);
    return { status: "ok", start };
  } catch (error) {
    console.error("Meta device authorization failed", error);
    return failure(
      error instanceof MuseError ? error.message : "Meta sign-in could not be started.",
    );
  }
}

export type ConnectPoll =
  | { status: "pending" }
  | { status: "slow_down"; intervalSeconds: number }
  | { status: "connected"; connection: MetaConnectionSummary }
  | { status: "denied" }
  | { status: "expired" }
  | Failure;

/** Once the member approves on Meta's site, mints their key and keeps it on their account. */
export async function pollMetaConnect(deviceCode: string): Promise<ConnectPoll> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const clientId = deviceClientId();
  if (
    !clientId ||
    !isMetaConnectionConfigured() ||
    typeof deviceCode !== "string" ||
    !deviceCode
  ) {
    return failure("Meta sign-in is not available.");
  }
  try {
    const poll = await pollDeviceAuthorization(clientId, deviceCode);
    if (poll.status !== "authorized") {
      return poll;
    }
    const apiKey = await mintApiKey(poll.identityToken);
    const connection = await saveMetaAccount(userId, {
      apiKey,
      identityToken: poll.identityToken,
    });
    revalidatePath("/settings");
    return { status: "connected", connection };
  } catch (error) {
    console.error("Meta device poll failed", error);
    return failure(error instanceof MuseError ? error.message : "Meta sign-in failed.");
  }
}

/** Confirms a pasted key works, then keeps it on the member's account. */
export async function connectMetaApiKey(
  apiKey: string,
): Promise<{ status: "connected"; connection: MetaConnectionSummary } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  if (!isMetaConnectionConfigured()) {
    return failure(NOT_CONFIGURED);
  }
  const parsed = apiKeySchema.safeParse(apiKey);
  if (!parsed.success) {
    return failure("That does not look like a Meta Model API key.");
  }
  const result = await listMuseModels(parsed.data);
  if (!result.ok) {
    return failure(result.error);
  }
  const connection = await saveMetaApiKey(userId, parsed.data);
  revalidatePath("/settings");
  return { status: "connected", connection };
}

export async function disconnectMeta(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    return;
  }
  await disconnectMetaAccount(userId);
  revalidatePath("/settings");
}
