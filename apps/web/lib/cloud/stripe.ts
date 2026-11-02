import "server-only";

import Stripe from "stripe";
import type { CloudLedgerEntry } from "@westride/db";
import { recordLedgerEntry, setStripeCustomerId } from "@westride/db/cloud";
import { getStripeConfig } from "./config";
import { centsToMicros, formatUsd, isValidTopUpMicros, microsToCents, microsToDollars } from "./pricing";

/**
 * Adding funds goes through Stripe Checkout: WeStride never sees a card.
 * The member is sent to Stripe's hosted page and comes back to /cloud; the
 * balance is credited from the paid session, once, whether the news arrives
 * first through the webhook or through the member's return. Both paths
 * write the same ledger reference, `stripe:<session id>`, so whichever is
 * second finds the entry already there.
 */

const CHECKOUT_PATH = "/cloud";

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Payments are not set up on this WeStride server.");
    this.name = "StripeNotConfiguredError";
  }
}

function stripeClient(): Stripe {
  const config = getStripeConfig();
  if (!config) {
    throw new StripeNotConfiguredError();
  }
  return new Stripe(config.secretKey, { typescript: true });
}

export async function createTopUpCheckout(input: {
  clerkUserId: string;
  amountMicros: number;
  /** The public origin to send the member back to. */
  origin: string;
  /** Pre-fills the email on Stripe's page when known. */
  email?: string | null;
  stripeCustomerId?: string | null;
}): Promise<{ url: string; sessionId: string }> {
  if (!isValidTopUpMicros(input.amountMicros)) {
    throw new Error("That amount is outside the allowed range.");
  }
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.clerkUserId,
    customer: input.stripeCustomerId ?? undefined,
    customer_email: input.stripeCustomerId ? undefined : (input.email ?? undefined),
    customer_creation: input.stripeCustomerId ? undefined : "always",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: microsToCents(input.amountMicros),
          product_data: {
            name: "WeStride Cloud funds",
            description: `${formatUsd(microsToDollars(input.amountMicros))} added to your WeStride Cloud balance for Meta AI models and sandbox compute.`,
          },
        },
      },
    ],
    metadata: {
      clerkUserId: input.clerkUserId,
      amountMicros: String(input.amountMicros),
      purpose: "westride-cloud-top-up",
    },
    success_url: `${input.origin}${CHECKOUT_PATH}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}${CHECKOUT_PATH}?checkout=cancelled`,
  });
  if (!session.url) {
    throw new Error("Stripe did not return a checkout page.");
  }
  return { url: session.url, sessionId: session.id };
}

export type CreditOutcome =
  | { status: "credited"; amountMicros: number; entry: CloudLedgerEntry }
  | { status: "already-credited"; amountMicros: number }
  | { status: "unpaid" }
  | { status: "not-ours" };

/**
 * Credits a paid Checkout session to the member it was created for. The
 * amount comes from what Stripe says was paid, not from what the member
 * asked for. When `expectedClerkUserId` is set (the member's own return),
 * a session for someone else is refused.
 */
export async function creditCheckoutSession(
  session: Stripe.Checkout.Session,
  expectedClerkUserId: string | null = null,
): Promise<CreditOutcome> {
  if (session.metadata?.purpose !== "westride-cloud-top-up") {
    return { status: "not-ours" };
  }
  const clerkUserId = session.metadata?.clerkUserId ?? session.client_reference_id;
  if (!clerkUserId || (expectedClerkUserId && clerkUserId !== expectedClerkUserId)) {
    return { status: "not-ours" };
  }
  if (session.payment_status !== "paid") {
    return { status: "unpaid" };
  }
  const paidCents = session.amount_total ?? 0;
  if (paidCents <= 0 || session.currency?.toLowerCase() !== "usd") {
    return { status: "unpaid" };
  }
  const amountMicros = centsToMicros(paidCents);

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (customerId) {
    await setStripeCustomerId(clerkUserId, customerId).catch((error) => {
      console.error("Stripe customer id save failed", error);
    });
  }

  const entry = await recordLedgerEntry({
    clerkUserId,
    kind: "TOP_UP",
    amountMicros,
    reference: `stripe:${session.id}`,
    description: `Added ${formatUsd(microsToDollars(amountMicros))} by card`,
  });
  if (!entry) {
    return { status: "already-credited", amountMicros };
  }
  return { status: "credited", amountMicros, entry };
}

/** The member came back from Stripe. Confirms and credits the session they were sent to. */
export async function confirmCheckoutSession(
  sessionId: string,
  clerkUserId: string,
): Promise<CreditOutcome> {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return creditCheckoutSession(session, clerkUserId);
}

/** Verifies a webhook delivery and returns the event, or null when it is not from Stripe. */
export function readWebhookEvent(payload: string, signature: string | null): Stripe.Event | null {
  const config = getStripeConfig();
  if (!config?.webhookSecret || !signature) {
    return null;
  }
  try {
    return Stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
  } catch (error) {
    console.warn("Stripe webhook signature rejected", error instanceof Error ? error.message : error);
    return null;
  }
}

export function isCheckoutSessionEvent(event: Stripe.Event): event is Stripe.Event & {
  data: { object: Stripe.Checkout.Session };
} {
  return (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  );
}
