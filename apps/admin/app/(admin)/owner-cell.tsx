"use client";

import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { shortId } from "@/lib/format";
import { userPath } from "@/lib/paths";

/** A member's name and email, linking to their admin page. Serialisable: built from a profile lookup on the server. */
export type OwnerCellData = {
  clerkUserId: string;
  name: string;
  email: string | null;
};

export function OwnerCell({ owner }: { owner: OwnerCellData | null }) {
  if (!owner) {
    return <Text type="supporting">Unclaimed</Text>;
  }
  return (
    <VStack gap={0}>
      <Link href={userPath(owner.clerkUserId)}>{owner.name}</Link>
      <Text type="supporting" maxLines={1}>
        {owner.email ?? shortId(owner.clerkUserId)}
      </Text>
    </VStack>
  );
}

export function VisibilityText({ isPublic }: { isPublic: boolean }) {
  return <Text type="supporting">{isPublic ? "Public" : "Private"}</Text>;
}
