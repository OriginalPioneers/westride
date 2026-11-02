"use client";

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { PlusIcon } from "@heroicons/react/24/outline";

/**
 * The first tile in a studio's "Your ..." grid: a whole card that starts a
 * new item. Sits in the same grid as the item cards so it reads as "the
 * next one". Signed-out visitors are sent to sign in instead.
 */
export function CreateTile({
  label,
  description,
  onClick,
  signInHref,
}: {
  label: string;
  description: string;
  /** Opens the create dialog. Null when the viewer is signed out. */
  onClick: (() => void) | null;
  signInHref: string;
}) {
  return (
    <ClickableCard
      label={label}
      onClick={onClick ?? undefined}
      href={onClick ? undefined : signInHref}
      variant="muted"
      height="100%"
    >
      <VStack gap={3} hAlign="center" vAlign="center" height="100%">
        <Icon icon={PlusIcon} size="lg" color="accent" />
        <VStack gap={1} hAlign="center">
          <Heading level={3} justify="center">
            {label}
          </Heading>
          <Text type="supporting" justify="center">
            {description}
          </Text>
        </VStack>
      </VStack>
    </ClickableCard>
  );
}
