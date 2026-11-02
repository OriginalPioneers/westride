import type { NextRequest } from "next/server";
import { creditCheckoutSession, isCheckoutSessionEvent, readWebhookEvent } from "@/lib/cloud/stripe";

/**
 * Stripe tells us when a Checkout session for WeStride Cloud funds has been
 * paid. Point a Stripe webhook endpoint at this route with the events
 * `checkout.session.completed` and `checkout.session.async_payment_succeeded`
 * and put its signing secret in STRIPE_WEBHOOK_SECRET. Crediting is
 * idempotent, so retries and the member's own return cannot double-count.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const event = readWebhookEvent(payload, request.headers.get("stripe-signature"));
  if (!event) {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (!isCheckoutSessionEvent(event)) {
    return Response.json({ received: true, ignored: event.type });
  }
  try {
    const outcome = await creditCheckoutSession(event.data.object);
    return Response.json({ received: true, outcome: outcome.status });
  } catch (error) {
    console.error("Stripe webhook credit failed", error);
    // A 500 makes Stripe retry, which is what we want for a transient fault.
    return Response.json({ error: "Credit failed." }, { status: 500 });
  }
}
