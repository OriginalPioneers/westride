"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { CloudProviderPreference } from "@westride/db";
import { getCloudAccount, redeemCode, setProviderPreference } from "@westride/db/cloud";
import { isStripeConfigured } from "@/lib/cloud/config";
import { dollarsToMicros, isValidTopUpMicros, MAX_TOP_UP_MICROS, MIN_TOP_UP_MICROS, microsToDollars } from "@/lib/cloud/pricing";
import { StripeNotConfiguredError, createTopUpCheckout } from "@/lib/cloud/stripe";
import { requestOrigin } from "@/lib/request-origin";

type Failure = { status: "error"; message: string };

function failure(message: string): Failure {
  return { status: "error", message };
}

const CLOUD_PATH = "/cloud";

function revalidateCloud() {
  revalidatePath(CLOUD_PATH);
  revalidatePath("/settings");
}

async function requireUser(): Promise<string | Failure> {
  const { userId } = await auth();
  return userId ?? failure("Sign in to manage WeStride Cloud.");
}

const amountSchema = z.number().finite().positive();

/** Sends the member to Stripe Checkout for the amount, in dollars. */
export async function startTopUp(amountDollars: number): Promise<Failure | never> {
  const userId = await requireUser();
  if (typeof userId !== "string") {
    return userId;
  }
  const parsed = amountSchema.safeParse(amountDollars);
  if (!parsed.success) {
    return failure("Enter an amount in dollars.");
  }
  const amountMicros = dollarsToMicros(parsed.data);
  if (!isValidTopUpMicros(amountMicros)) {
    return failure(
      `Add between $${microsToDollars(MIN_TOP_UP_MICROS)} and $${microsToDollars(MAX_TOP_UP_MICROS)} at a time.`,
    );
  }
  if (!isStripeConfigured()) {
    return failure("Payments are not set up on this WeStride server yet.");
  }

  let url: string;
  try {
    const [origin, user, account] = await Promise.all([
      requestOrigin(),
      currentUser(),
      getCloudAccount(userId),
    ]);
    const session = await createTopUpCheckout({
      clerkUserId: userId,
      amountMicros,
      origin,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      stripeCustomerId: account?.stripeCustomerId ?? null,
    });
    url = session.url;
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return failure(error.message);
    }
    console.error("Stripe checkout failed", error);
    return failure("Stripe could not start the payment. Try again in a moment.");
  }
  redirect(url);
}

const codeSchema = z.string().trim().min(4).max(64);

export type RedeemOutcome = { status: "ok"; amountMicros: number } | Failure;

const REDEEM_MESSAGES = {
  unknown: "That code is not one of ours. Check it and try again.",
  expired: "That code has expired.",
  exhausted: "That code has been used up.",
  "already-redeemed": "You have already redeemed that code.",
} as const;

/** Adds a code's value to the member's balance, once per member. */
export async function redeemCloudCode(rawCode: string): Promise<RedeemOutcome> {
  const userId = await requireUser();
  if (typeof userId !== "string") {
    return userId;
  }
  const parsed = codeSchema.safeParse(rawCode);
  if (!parsed.success) {
    return failure("Enter the code you were given.");
  }
  try {
    const result = await redeemCode(userId, parsed.data);
    if (result.status !== "ok") {
      return failure(REDEEM_MESSAGES[result.status]);
    }
    revalidateCloud();
    return { status: "ok", amountMicros: result.amountMicros };
  } catch (error) {
    console.error("Code redemption failed", error);
    return failure("The code could not be redeemed right now. Try again in a moment.");
  }
}

const preferenceSchema = z.enum(["OWN", "WESTRIDE_CLOUD"]);

/** Which provider Muse and sandboxes should use first for this member. */
export async function chooseProvider(
  preference: CloudProviderPreference,
): Promise<{ status: "ok"; preference: CloudProviderPreference } | Failure> {
  const userId = await requireUser();
  if (typeof userId !== "string") {
    return userId;
  }
  const parsed = preferenceSchema.safeParse(preference);
  if (!parsed.success) {
    return failure("Choose a provider.");
  }
  await setProviderPreference(userId, parsed.data);
  revalidateCloud();
  return { status: "ok", preference: parsed.data };
}
