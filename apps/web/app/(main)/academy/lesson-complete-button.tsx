"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { setLessonCompletion } from "./actions";

export function LessonCompleteButton({
  lessonId,
  isComplete,
  completedAt,
  nextHref,
  nextLabel,
}: {
  lessonId: string;
  isComplete: boolean;
  completedAt: string | null;
  /** Where to send the member after they finish; omitted on the last lesson. */
  nextHref: string | null;
  nextLabel: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const result = await setLessonCompletion(lessonId, !isComplete);
    if (result.status !== "ok") {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <VStack gap={3}>
      {error ? <Banner status="warning" title={error} /> : null}
      <HStack gap={3} vAlign="center" wrap="wrap">
        {isComplete ? (
          <>
            <Button
              label="Mark as not complete"
              variant="secondary"
              clickAction={toggle}
            />
            {nextHref && nextLabel ? (
              <Button
                label={`Next: ${nextLabel}`}
                variant="primary"
                href={nextHref}
                endContent={<Icon icon="chevronRight" />}
              />
            ) : null}
          </>
        ) : (
          <Button
            label="Mark lesson complete"
            variant="primary"
            icon={<Icon icon="check" />}
            clickAction={toggle}
          />
        )}
        {isComplete && completedAt ? (
          <Text type="supporting">
            Completed {formatCompletedAt(completedAt)}
          </Text>
        ) : null}
      </HStack>
    </VStack>
  );
}

function formatCompletedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
