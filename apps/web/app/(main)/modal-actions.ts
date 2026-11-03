"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OwnSandboxProvider } from "@westride/db";
import { setSandboxProvider } from "@westride/db/cloud";
import {
  describeModalError,
  listModalEnvironments,
  looksLikeModalTokenId,
  looksLikeModalTokenSecret,
} from "@/lib/modal/client";
import {
  disconnectModalAccount,
  getModalSandboxCredentials,
  isModalConnectionConfigured,
  saveModalToken,
  setModalEnvironment,
  type ModalConnectionSummary,
} from "@/lib/modal/connection";

type Failure = { status: "error"; message: string };

function failure(message: string): Failure {
  return { status: "error", message };
}

const NOT_CONFIGURED = "Connecting Modal is not set up on this WeStride server yet.";
const RECONNECT = "Modal no longer accepts this token. Connect again.";
const UNREACHABLE = "Modal could not be reached. Try again in a moment.";
const tokenPartSchema = z.string().trim().min(8).max(512);
/** Modal environment names: letters, digits, dashes, underscores, dots. */
const environmentSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/, "That is not a Modal environment name.");

export type ModalConnected = {
  status: "connected";
  connection: ModalConnectionSummary;
  /** Every environment in the workspace, so the member can pick one straight away. */
  environments: string[];
};

/** Confirms a pasted token works against Modal, then keeps it on the member's account. */
export async function connectModalToken(input: {
  tokenId: string;
  tokenSecret: string;
}): Promise<ModalConnected | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  if (!isModalConnectionConfigured()) {
    return failure(NOT_CONFIGURED);
  }
  const tokenId = tokenPartSchema.safeParse(input?.tokenId);
  const tokenSecret = tokenPartSchema.safeParse(input?.tokenSecret);
  if (!tokenId.success || !looksLikeModalTokenId(tokenId.data)) {
    return failure("The token ID should start with ak-. Copy both halves from Modal's API Tokens page.");
  }
  if (!tokenSecret.success || !looksLikeModalTokenSecret(tokenSecret.data)) {
    return failure("The token secret should start with as-. Modal shows it only once, when the token is created.");
  }
  try {
    const { connection, environments } = await saveModalToken(userId, {
      tokenId: tokenId.data,
      tokenSecret: tokenSecret.data,
    });
    revalidatePath("/settings");
    return { status: "connected", connection, environments };
  } catch (error) {
    console.error("Modal token check failed", error);
    return failure(describeModalError(error, UNREACHABLE));
  }
}

/** The environments the connected token's workspace has, for the environment picker. */
export async function loadModalEnvironments(): Promise<
  { status: "ok"; environments: string[] } | Failure
> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  try {
    const credentials = await getModalSandboxCredentials(userId);
    if (!credentials) {
      return failure(RECONNECT);
    }
    return { status: "ok", environments: await listModalEnvironments(credentials) };
  } catch (error) {
    console.error("Modal environment lookup failed", error);
    return failure(describeModalError(error, UNREACHABLE));
  }
}

/** Records the environment the member's sandboxes run in. */
export async function chooseModalEnvironment(
  environment: string,
): Promise<{ status: "ok"; connection: ModalConnectionSummary } | Failure> {
  const { userId } = await auth();
  if (!userId) {
    return failure("Sign in first.");
  }
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Choose an environment.");
  }
  try {
    const credentials = await getModalSandboxCredentials(userId);
    if (!credentials) {
      return failure(RECONNECT);
    }
    const environments = await listModalEnvironments(credentials);
    if (!environments.includes(parsed.data)) {
      return failure("That environment is not in this Modal workspace.");
    }
    const connection = await setModalEnvironment(userId, parsed.data);
    if (!connection) {
      return failure(RECONNECT);
    }
    revalidatePath("/settings");
    return { status: "ok", connection };
  } catch (error) {
    console.error("Modal environment save failed", error);
    return failure(describeModalError(error, UNREACHABLE));
  }
}

export async function disconnectModal(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    return;
  }
  await disconnectModalAccount(userId);
  revalidatePath("/settings");
}

/** Which of the member's own accounts hosts sandboxes, when both Vercel and Modal are connected. */
export async function chooseSandboxProvider(provider: OwnSandboxProvider): Promise<void> {
  const { userId } = await auth();
  if (!userId || (provider !== "VERCEL" && provider !== "MODAL")) {
    return;
  }
  await setSandboxProvider(userId, provider);
  revalidatePath("/settings");
}
