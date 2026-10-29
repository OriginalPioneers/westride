"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { challengeMilestones } from "../achievements/track-progress";
import { achievementIcons } from "../achievements/achievement-icons";

export function EditAccountButton() {
  const { openUserProfile } = useClerk();

  return (
    <Button
      label="Edit account"
      onClick={() => {
        openUserProfile();
      }}
    />
  );
}

export function ChallengeProgress({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  return (
    <ProgressBar
      label="Challenges finished"
      value={value}
      max={max}
      marks={challengeMilestones}
      hasValueLabel
      variant={value >= max && max > 0 ? "success" : "accent"}
      formatValueLabel={(current, total) => `${current} of ${total}`}
    />
  );
}

export type EarnedAchievement = {
  slug: string;
  name: string;
  description: string;
  earnedAt: string;
};

function iconFor(slug: string) {
  if (Object.prototype.hasOwnProperty.call(achievementIcons, slug)) {
    return achievementIcons[slug as keyof typeof achievementIcons];
  }
  return TrophyIcon;
}

export function EarnedAchievements({ items }: { items: EarnedAchievement[] }) {
  return (
    <List edge="flush" density="compact" hasDividers>
      {items.map((item) => (
        <ListItem
          key={item.slug}
          href="/achievements"
          align="first-line"
          label={item.name}
          description={
            <Text type="supporting" maxLines={2}>
              {item.description}
            </Text>
          }
          startContent={<Icon icon={iconFor(item.slug)} size="lg" />}
          endContent={<Timestamp value={item.earnedAt} format="date" />}
        />
      ))}
    </List>
  );
}
