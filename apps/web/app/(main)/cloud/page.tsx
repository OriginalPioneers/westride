import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listLedgerEntries, sumCloudTotals } from "@westride/db/cloud";
import { getCloudAvailability } from "@/lib/cloud/config";
import { formatUsd, microsToDollars } from "@/lib/cloud/pricing";
import { getCloudStatus } from "@/lib/cloud/provider";
import { confirmCheckoutSession, type CreditOutcome } from "@/lib/cloud/stripe";
import { CloudPanel, type LedgerRow } from "./cloud-panel";

export const metadata: Metadata = {
  title: "WeStride Cloud",
};

type Notice = { status: "success" | "info" | "warning" | "error"; title: string; description?: string };

function noticeFor(checkout: string | undefined, outcome: CreditOutcome | "failed" | null): Notice | null {
  if (checkout === "cancelled") {
    return { status: "info", title: "No payment was made", description: "Your balance is unchanged." };
  }
  if (checkout !== "success") {
    return null;
  }
  if (outcome === null || outcome === "failed") {
    return {
      status: "warning",
      title: "Checking your payment",
      description:
        "Stripe is still confirming it. Your balance updates as soon as the payment is confirmed; refresh in a moment.",
    };
  }
  switch (outcome.status) {
    case "credited":
    case "already-credited":
      return {
        status: "success",
        title: `${formatUsd(microsToDollars(outcome.amountMicros))} added to your balance`,
        description: "Thank you. Muse and sandboxes can use WeStride Cloud now.",
      };
    case "unpaid":
      return {
        status: "info",
        title: "Payment pending",
        description: "Your bank has not confirmed the payment yet. The funds appear once it does.",
      };
    case "not-ours":
      return { status: "error", title: "That payment does not belong to this account" };
  }
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function CloudPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[]; session_id?: string | string[] }>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/cloud" });
  }
  const params = await searchParams;
  const checkout = first(params.checkout);
  const sessionId = first(params.session_id);
  const availability = getCloudAvailability();

  let outcome: CreditOutcome | "failed" | null = null;
  if (checkout === "success" && sessionId && availability.payments) {
    try {
      outcome = await confirmCheckoutSession(sessionId, userId);
    } catch (error) {
      console.error("Checkout confirmation failed", error);
      outcome = "failed";
    }
  }

  const [status, entries, totals] = await Promise.all([
    getCloudStatus(userId),
    listLedgerEntries(userId, 100),
    sumCloudTotals(userId),
  ]);
  const notice = noticeFor(checkout, outcome);
  const rows: LedgerRow[] = entries.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    amountMicros: entry.amountMicros,
    description: entry.description,
    model: entry.model,
    createdAt: entry.createdAt.toISOString(),
  }));

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={2}>
            <Heading level={1}>WeStride Cloud</Heading>
            <Text type="supporting">
              Meta AI models and sandbox compute on WeStride&apos;s accounts, paid from a balance you
              top up. Bring your own Meta and Vercel accounts instead and WeStride stays free.
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {notice ? (
              <Banner
                status={notice.status}
                title={notice.title}
                description={notice.description}
                isDismissable={notice.status === "success" || notice.status === "info"}
              />
            ) : null}
            <CloudPanel
              balanceMicros={status.balanceMicros}
              preference={status.preference}
              availability={availability}
              totals={totals}
              rows={rows}
            />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
