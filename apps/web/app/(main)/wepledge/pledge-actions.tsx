"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { PledgeStatus } from "@westride/db";
import { setPledgeStatusAction } from "../support-actions";

export function PledgeActions({
  pledgeId,
  ideaId,
  status,
}: {
  pledgeId: string;
  ideaId: string;
  status: PledgeStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(next: PledgeStatus) {
    startTransition(async () => {
      const result = await setPledgeStatusAction({ pledgeId, ideaId, status: next });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  if (status === "REVOKED") {
    return <Button label="Pledge again" variant="secondary" size="sm" isLoading={isPending} onClick={() => set("ACTIVE")} />;
  }
  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      {error ? <Text type="supporting">{error}</Text> : null}
      <Button
        label={status === "ACTIVE" ? "Pause" : "Resume"}
        variant="secondary"
        size="sm"
        isDisabled={isPending}
        onClick={() => set(status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
      />
      <Button label="End" variant="ghost" size="sm" isDisabled={isPending} onClick={() => set("REVOKED")} />
    </HStack>
  );
}
