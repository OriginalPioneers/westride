"use server";

import { auth } from "@clerk/nextjs/server";
import type { DevicePairingCode, Pledge } from "@westride/db";
import { createPairingCode, renameDevice, revokeDevice } from "@westride/db/devices";
import { getIdea } from "@westride/db/ideas";
import { savePledge, setPledgeStatus, updateIdeaSupportSettings } from "@westride/db/support";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, isFailure, type Failure } from "@/lib/build/access";
import { uuidSchema } from "@/lib/build/schema";
import { ideaPath } from "@/lib/ideas/filters";
import {
  computePledgeSchema,
  dollarsToMicros,
  fieldErrorsFrom,
  renameDeviceSchema,
  supportSettingsSchema,
  supportingPath,
  tokenPledgeSchema,
} from "@/lib/support/schema";

type Ok = { status: "ok" };

async function requireUser(message: string): Promise<{ userId: string } | Failure> {
  const { userId } = await auth();
  return userId ? { userId } : failure(message);
}

/** The idea must exist and be visible to the supporter; pledging to a private idea needs membership. */
async function requireVisibleIdea(ideaId: string, userId: string) {
  if (!uuidSchema.safeParse(ideaId).success) {
    return failure("That idea does not exist.");
  }
  const idea = await getIdea(ideaId, { clerkUserId: userId });
  if (!idea) {
    return failure("That idea does not exist.");
  }
  return idea;
}

function revalidateSupport(ideaId?: string) {
  revalidatePath(supportingPath());
  revalidatePath("/");
  if (ideaId) {
    revalidatePath(ideaPath(ideaId));
  }
}

// ---------------------------------------------------------------------------
// Pledges
// ---------------------------------------------------------------------------

export type PledgeResult = { status: "ok"; pledge: Pledge } | Failure;

export async function pledgeTokensAction(input: unknown): Promise<PledgeResult> {
  const user = await requireUser("Sign in to pledge tokens.");
  if (isFailure(user)) return user;
  const parsed = tokenPledgeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const idea = await requireVisibleIdea(parsed.data.ideaId, user.userId);
  if (isFailure(idea)) return idea;
  try {
    const pledge = await savePledge({
      ideaId: idea.id,
      clerkUserId: user.userId,
      kind: "TOKENS",
      capMicros: dollarsToMicros(parsed.data.capDollars),
      resetsMonthly: parsed.data.resetsMonthly,
      note: parsed.data.note,
    });
    revalidateSupport(idea.id);
    return { status: "ok", pledge };
  } catch (error) {
    console.error("Token pledge failed", error);
    return failure("The pledge could not be saved. Try again.");
  }
}

export async function pledgeComputeAction(input: unknown): Promise<PledgeResult> {
  const user = await requireUser("Sign in to pledge compute.");
  if (isFailure(user)) return user;
  const parsed = computePledgeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const idea = await requireVisibleIdea(parsed.data.ideaId, user.userId);
  if (isFailure(idea)) return idea;
  try {
    const pledge = await savePledge({
      ideaId: idea.id,
      clerkUserId: user.userId,
      kind: "COMPUTE",
      capMicros: null,
      resetsMonthly: false,
      note: parsed.data.note,
    });
    revalidateSupport(idea.id);
    return { status: "ok", pledge };
  } catch (error) {
    console.error("Compute pledge failed", error);
    return failure("The pledge could not be saved. Try again.");
  }
}

const pledgeStatusSchema = z.object({
  pledgeId: uuidSchema,
  status: z.enum(["ACTIVE", "PAUSED", "REVOKED"]),
  ideaId: uuidSchema.optional(),
});

export async function setPledgeStatusAction(input: unknown): Promise<Ok | Failure> {
  const user = await requireUser("Sign in to change a pledge.");
  if (isFailure(user)) return user;
  const parsed = pledgeStatusSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That pledge could not be changed.");
  }
  const changed = await setPledgeStatus(parsed.data.pledgeId, user.userId, parsed.data.status);
  if (!changed) {
    return failure("That pledge is not yours to change.");
  }
  revalidateSupport(parsed.data.ideaId);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Idea support settings (founder)
// ---------------------------------------------------------------------------

export async function updateIdeaSupportAction(ideaId: string, input: unknown): Promise<Ok | Failure> {
  const user = await requireUser("Sign in to change this idea.");
  if (isFailure(user)) return user;
  const parsed = supportSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const idea = await requireVisibleIdea(ideaId, user.userId);
  if (isFailure(idea)) return idea;
  try {
    await updateIdeaSupportSettings(idea.id, user.userId, {
      ...parsed.data,
      capitalLinks: parsed.data.wantsCapital ? parsed.data.capitalLinks : [],
    });
    revalidateSupport(idea.id);
    revalidatePath("/ideas");
    return { status: "ok" };
  } catch (error) {
    console.error("Support settings update failed", error);
    return failure(error instanceof Error ? error.message : "The settings could not be saved. Try again.");
  }
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export type PairingCodeResult = { status: "ok"; code: DevicePairingCode } | Failure;

export async function createPairingCodeAction(): Promise<PairingCodeResult> {
  const user = await requireUser("Sign in to link a computer.");
  if (isFailure(user)) return user;
  try {
    const code = await createPairingCode(user.userId);
    revalidatePath(supportingPath());
    return { status: "ok", code };
  } catch (error) {
    console.error("Pairing code failed", error);
    return failure("A pairing code could not be made. Try again.");
  }
}

export async function renameDeviceAction(input: unknown): Promise<Ok | Failure> {
  const user = await requireUser("Sign in to rename a computer.");
  if (isFailure(user)) return user;
  const parsed = renameDeviceSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  const renamed = await renameDevice(parsed.data.deviceId, user.userId, parsed.data.name);
  if (!renamed) {
    return failure("That computer is not linked to your account.");
  }
  revalidatePath(supportingPath());
  return { status: "ok" };
}

export async function revokeDeviceAction(deviceId: string): Promise<Ok | Failure> {
  const user = await requireUser("Sign in to unlink a computer.");
  if (isFailure(user)) return user;
  if (!uuidSchema.safeParse(deviceId).success) {
    return failure("That computer is not linked to your account.");
  }
  const revoked = await revokeDevice(deviceId, user.userId);
  if (!revoked) {
    return failure("That computer is not linked to your account.");
  }
  revalidatePath(supportingPath());
  return { status: "ok" };
}
