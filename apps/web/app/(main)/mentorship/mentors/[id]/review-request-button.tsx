"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { markMentorRequestReviewed } from "../../actions";

export function ReviewRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, startReview] = useTransition();

  return (
    <VStack gap={1} hAlign="end">
      <Button
        label="Mark reviewed"
        size="sm"
        onClick={() => {
          setError(null);
          startReview(async () => {
            const saved = await markMentorRequestReviewed(requestId);
            if (!saved) {
              setError("Could not update that request.");
              return;
            }
            router.refresh();
          });
        }}
        isLoading={isReviewing}
      />
      {error ? <Text type="supporting">{error}</Text> : null}
    </VStack>
  );
}
