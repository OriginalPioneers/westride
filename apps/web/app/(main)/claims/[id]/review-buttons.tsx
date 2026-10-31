"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { reviewClaimRequest, type ReviewDecision } from "../../ideas/claim-actions";

/** Approve or deny from the emailed link. Each is a deliberate click, never a GET. */
export function ReviewButtons({
  requestId,
  token,
  requesterName,
  ideaName,
}: {
  requestId: string;
  token: string;
  requesterName: string;
  ideaName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ReviewDecision | null>(null);
  const [isDeciding, startDeciding] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: ReviewDecision) {
    setPending(decision);
    setError(null);
    startDeciding(async () => {
      const result = await reviewClaimRequest(requestId, token, decision);
      if (result.status === "error") {
        setError(result.message);
        setPending(null);
        return;
      }
      router.refresh();
    });
  }

  return (
    <VStack gap={3}>
      {error ? <Banner status="error" title={error} /> : null}
      <Text type="supporting">
        Approving makes {requesterName} the founder of {ideaName} and the owner
        of the project built from it. Denying closes the request and emails
        them.
      </Text>
      <HStack gap={2} wrap="wrap">
        <Button
          label="Approve claim"
          variant="primary"
          isLoading={isDeciding && pending === "approve"}
          isDisabled={isDeciding && pending !== "approve"}
          onClick={() => decide("approve")}
        />
        <Button
          label="Deny"
          variant="secondary"
          isLoading={isDeciding && pending === "deny"}
          isDisabled={isDeciding && pending !== "deny"}
          onClick={() => decide("deny")}
        />
      </HStack>
    </VStack>
  );
}
