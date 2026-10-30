"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { StarIcon } from "@heroicons/react/20/solid";
import type { IdeaType } from "@westride/db";
import { IDEA_TYPE_LABELS } from "@/lib/ideas/filters";

const TYPE_BADGE_VARIANT: Record<IdeaType, "blue" | "green" | "purple"> = {
  BUSINESS: "blue",
  NON_PROFIT: "green",
  GAME: "purple",
};

export function IdeaTypeBadge({ type }: { type: IdeaType }) {
  return (
    <Badge variant={TYPE_BADGE_VARIANT[type]} label={IDEA_TYPE_LABELS[type]} />
  );
}

// Icon takes a component, which a server component cannot hand across the
// boundary. The badge is client-rendered so the star stays sized.
export function FeaturedBadge() {
  return (
    <Badge
      variant="yellow"
      icon={<Icon icon={StarIcon} size="xsm" />}
      label="Featured"
    />
  );
}
