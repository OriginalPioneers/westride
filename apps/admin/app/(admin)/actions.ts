"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  adjustCloudBalance,
  setAgentFeatured,
  setIdeaFeatured,
  setProjectFeatured,
} from "@westride/db/admin";
import type { CloudRedemptionCode } from "@westride/db";
import {
  createRedemptionCode,
  generateRedemptionCode,
  getCloudBalanceMicros,
  getRedemptionCodeByCode,
  normalizeRedemptionCode,
  REDEMPTION_CODE_PATTERN,
  setRedemptionCodeActive,
} from "@westride/db/cloud";
import { ADMIN_ROLE, failure, requireAdminForAction, type ActionFailure } from "@/lib/admin-auth";
import { setAdminRole, type AdminUserProfile } from "@/lib/clerk-users";
import { dollarsToMicros, formatMicros } from "@/lib/format";
import { ADMIN_PATHS, userPath } from "@/lib/paths";

type Ok<T = Record<never, never>> = { status: "ok" } & T;

// ---------------------------------------------------------------------------
// Featured
// ---------------------------------------------------------------------------

export type FeaturedKind = "idea" | "project" | "agent";

const featuredSchema = z.object({
  kind: z.enum(["idea", "project", "agent"]),
  id: z.uuid(),
  isFeatured: z.boolean(),
});

const FEATURED_SETTERS: Record<FeaturedKind, (id: string, isFeatured: boolean) => Promise<boolean>> = {
  idea: setIdeaFeatured,
  project: setProjectFeatured,
  agent: setAgentFeatured,
};

const FEATURED_PATHS: Record<FeaturedKind, string> = {
  idea: ADMIN_PATHS.ideas,
  project: ADMIN_PATHS.projects,
  agent: ADMIN_PATHS.agents,
};

/** Marks an idea, build, or agent as picked by the WeStride team, or unpicks it. */
export async function setFeaturedAction(input: z.input<typeof featuredSchema>): Promise<Ok | ActionFailure> {
  const admin = await requireAdminForAction();
  if (typeof admin !== "string") {
    return admin;
  }
  const parsed = featuredSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That item could not be read.");
  }
  const { kind, id, isFeatured } = parsed.data;
  const found = await FEATURED_SETTERS[kind](id, isFeatured);
  if (!found) {
    return failure("That item no longer exists.");
  }
  revalidatePath(FEATURED_PATHS[kind]);
  revalidatePath(ADMIN_PATHS.dashboard);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Redemption codes
// ---------------------------------------------------------------------------

const MAX_CODE_DOLLARS = 10_000;

const issueCodeSchema = z.object({
  /** Blank asks for a generated code. */
  code: z.string().trim().max(64).default(""),
  amountDollars: z.number().positive().max(MAX_CODE_DOLLARS),
  /** Null is unlimited. */
  maxRedemptions: z.number().int().positive().max(1_000_000).nullable().default(null),
  /** ISO date, or null for no expiry. */
  expiresAt: z.string().nullable().default(null),
  note: z.string().trim().max(500).default(""),
});

export type IssueCodeInput = z.input<typeof issueCodeSchema>;

export type IssuedCode = {
  id: string;
  code: string;
  amountMicros: number;
};

export async function issueCodeAction(input: IssueCodeInput): Promise<Ok<{ code: IssuedCode }> | ActionFailure> {
  const admin = await requireAdminForAction();
  if (typeof admin !== "string") {
    return admin;
  }
  const parsed = issueCodeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue?.path[0] === "amountDollars" ? `Enter an amount up to ${formatMicros(dollarsToMicros(MAX_CODE_DOLLARS))}.` : "Check the form and try again.");
  }
  const { amountDollars, maxRedemptions, note } = parsed.data;

  let code = parsed.data.code ? normalizeRedemptionCode(parsed.data.code) : generateRedemptionCode();
  if (!REDEMPTION_CODE_PATTERN.test(code)) {
    return failure("Codes are 4 to 64 letters, digits, and dashes.");
  }
  if (await getRedemptionCodeByCode(code)) {
    if (parsed.data.code) {
      return failure("That code already exists. Pick another, or leave it blank to generate one.");
    }
    code = generateRedemptionCode();
  }

  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    expiresAt = new Date(parsed.data.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return failure("The expiry date could not be read.");
    }
    if (expiresAt.getTime() <= Date.now()) {
      return failure("The expiry date is already in the past.");
    }
  }

  let created: CloudRedemptionCode;
  try {
    created = await createRedemptionCode({
      code,
      amountMicros: dollarsToMicros(amountDollars),
      maxRedemptions,
      expiresAt,
      note: note ? `${note} (issued by ${admin})` : `Issued by ${admin}`,
    });
  } catch (error) {
    console.error("Issuing a redemption code failed", error);
    return failure("The code could not be saved. Try again.");
  }
  revalidatePath(ADMIN_PATHS.codes);
  revalidatePath(ADMIN_PATHS.dashboard);
  return { status: "ok", code: { id: created.id, code: created.code, amountMicros: created.amountMicros } };
}

const codeActiveSchema = z.object({ code: z.string().trim().min(1).max(64), isActive: z.boolean() });

/** Turns a code off so it is refused, or back on. */
export async function setCodeActiveAction(input: z.input<typeof codeActiveSchema>): Promise<Ok | ActionFailure> {
  const admin = await requireAdminForAction();
  if (typeof admin !== "string") {
    return admin;
  }
  const parsed = codeActiveSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That code could not be read.");
  }
  const found = await setRedemptionCodeActive(parsed.data.code, parsed.data.isActive);
  if (!found) {
    return failure("That code no longer exists.");
  }
  revalidatePath(ADMIN_PATHS.codes);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const roleSchema = z.object({ clerkUserId: z.string().trim().min(1).max(128), isAdmin: z.boolean() });

/** Grants or revokes the admin role. An admin cannot remove their own. */
export async function setAdminRoleAction(
  input: z.input<typeof roleSchema>,
): Promise<Ok<{ profile: AdminUserProfile }> | ActionFailure> {
  const admin = await requireAdminForAction();
  if (typeof admin !== "string") {
    return admin;
  }
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That account could not be read.");
  }
  const { clerkUserId, isAdmin } = parsed.data;
  if (clerkUserId === admin && !isAdmin) {
    return failure("You cannot remove your own admin role. Ask another admin to do it.");
  }
  try {
    const profile = await setAdminRole(clerkUserId, ADMIN_ROLE, isAdmin);
    revalidatePath(ADMIN_PATHS.users);
    revalidatePath(userPath(clerkUserId));
    return { status: "ok", profile };
  } catch (error) {
    console.error("Updating the admin role failed", error);
    return failure("Clerk did not accept the change. Try again.");
  }
}

const MAX_ADJUSTMENT_DOLLARS = 10_000;

const adjustmentSchema = z.object({
  clerkUserId: z.string().trim().min(1).max(128),
  /** Positive credits the member, negative charges them. */
  amountDollars: z
    .number()
    .refine((value) => value !== 0, "Enter an amount.")
    .refine((value) => Math.abs(value) <= MAX_ADJUSTMENT_DOLLARS, `Adjust up to ${formatMicros(dollarsToMicros(MAX_ADJUSTMENT_DOLLARS))} at a time.`),
  description: z.string().trim().min(3, "Say why, in a few words; the member sees it.").max(200),
});

export type AdjustBalanceInput = z.input<typeof adjustmentSchema>;

/** A manual credit or charge on a member's WeStride Cloud balance. */
export async function adjustBalanceAction(input: AdjustBalanceInput): Promise<Ok<{ balanceMicros: number }> | ActionFailure> {
  const admin = await requireAdminForAction();
  if (typeof admin !== "string") {
    return admin;
  }
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }
  const { clerkUserId, amountDollars, description } = parsed.data;
  const entry = await adjustCloudBalance({
    clerkUserId,
    amountMicros: dollarsToMicros(amountDollars),
    description,
    adminClerkUserId: admin,
  });
  if (!entry) {
    return failure("The adjustment could not be recorded. Try again.");
  }
  revalidatePath(userPath(clerkUserId));
  revalidatePath(ADMIN_PATHS.users);
  return { status: "ok", balanceMicros: await getCloudBalanceMicros(clerkUserId) };
}
