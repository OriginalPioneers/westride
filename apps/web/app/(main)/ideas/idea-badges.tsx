"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { StarIcon } from "@heroicons/react/20/solid";
import type { IdeaType } from "@westride/db";
import { IDEA_TYPE_LABELS } from "@/lib/ideas/filters";

const TYPE_BADGE_VARIANT: Record<IdeaType, "blue" | "green" | "purple" | "teal"> = {
  BUSINESS: "blue",
  NON_PROFIT: "green",
  GAME: "purple",
  OPEN_SOURCE: "teal",
};

export function IdeaTypeBadge({ type }: { type: IdeaType }) {
  return (
    <Badge variant={TYPE_BADGE_VARIANT[type]} label={IDEA_TYPE_LABELS[type]} />
  );
}

/** An imported idea or project that still has no founder or owner. */
export function UnclaimedBadge() {
  return <Badge variant="orange" label="Unclaimed" />;
}

/** What the team is asking supporters for. */
export function LookingForBadges({
  idea,
}: {
  idea: { wantsTokens: boolean; wantsCompute: boolean; wantsCapital: boolean };
}) {
  return (
    <>
      {idea.wantsTokens ? <Badge variant="blue" label="Looking for tokens" /> : null}
      {idea.wantsCompute ? <Badge variant="green" label="Looking for compute" /> : null}
      {idea.wantsCapital ? <Badge variant="orange" label="Looking for capital" /> : null}
    </>
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
