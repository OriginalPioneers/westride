"use client";
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Stepper, Step } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { achievementCatalog, achievementGroups } from "@westride/db";
import { challengeCatalog } from "@westride/db/challenges";
import type { AchievementWithProgress } from "@westride/db/client";
import type { LearningAttempt } from "@westride/db/learning";
import { signInPath } from "@/lib/auth-paths";
import { achievementIcons } from "./achievement-icons";
import { ChallengeDialog } from "./challenge-dialog";
import { MuseCompanion } from "./muse-companion";
export function AchievementTrack({
  achievements,
  attempts,
  viewerId,
}: {
  achievements: AchievementWithProgress[];
  attempts: LearningAttempt[];
  viewerId: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const earned = new Map(
    achievements.filter((a) => a.earnedAt).map((a) => [a.slug, a.earnedAt!]),
  );
  const completed = new Set(
    attempts.filter((a) => a.completedAt).map((a) => a.challengeSlug),
  );
  const revised = new Set(
    attempts
      .filter((a) => a.feedback && a.revision)
      .map((a) => a.challengeSlug),
  );
  const current =
    attempts.find((a) => !a.completedAt)?.challengeSlug ??
    challengeCatalog.find((c) => !completed.has(c.slug))?.slug ??
    challengeCatalog[0].slug;
  const selectedAttempt =
    attempts.find((a) => a.challengeSlug === selected && !a.completedAt) ??
    attempts.find((a) => a.challengeSlug === selected);
  const groups = achievementGroups.map((group) => ({
    group,
    items: achievementCatalog.filter((a) => a.group === group),
  }));
  const firstIncomplete = groups.findIndex(({ items }) =>
    items.some((a) => !earned.has(a.slug)),
  );
  function progress(slug: string) {
    const target = { "three-for-three": 3, "on-a-roll": 6, "full-circle": 12 }[
      slug
    ];
    if (target)
      return `${Math.min(completed.size, target)} of ${target} challenges`;
    if (slug === "thoughtful-revisions")
      return `${Math.min(revised.size, 3)} of 3 revisions`;
    return "Not earned yet";
  }
  return (
    <VStack gap={6}>
      <HStack gap={4} vAlign="center" wrap="wrap">
        <MuseCompanion />
        <VStack gap={2}>
          <Heading level={2}>Small steps. Bright ideas.</Heading>
          <Text>
            Explore, practice, and collect 24 achievements at your own pace.
          </Text>
          {viewerId ? (
            <Button
              label="Try a 2-minute challenge"
              variant="primary"
              onClick={() => setSelected(current)}
            />
          ) : (
            <Button
              label="Sign in to start"
              href={signInPath}
              variant="primary"
            />
          )}
        </VStack>
      </HStack>
      <ProgressBar
        label="Your achievements"
        value={earned.size}
        max={24}
        hasValueLabel
        formatValueLabel={(value, max) => `${value} of ${max} earned`}
      />
      <Stepper
        orientation="vertical"
        indicatorPosition="on-track"
        activeStep={firstIncomplete < 0 ? groups.length : firstIncomplete}
        label="Your learning track"
      >
        {groups.map(({ group, items }, index) => (
          <Step
            key={group}
            step={index}
            label={group}
            description={`${items.filter((a) => earned.has(a.slug)).length} of 6 earned`}
          >
            <List edge="flush" hasDividers>
              {items.map((item) => {
                const date = earned.get(item.slug);
                const challenge = challengeCatalog.find(
                  (c) => c.slug === item.slug,
                );
                return (
                  <ListItem
                    key={item.slug}
                    label={item.name}
                    startContent={
                      <Icon
                        icon={achievementIcons[item.slug]}
                        size="lg"
                        color={date ? "success" : "secondary"}
                      />
                    }
                    description={
                      <VStack gap={1}>
                        <Text type="supporting">{item.description}</Text>
                        <Text type="supporting">
                          {date
                            ? `Earned ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                            : progress(item.slug)}
                        </Text>
                      </VStack>
                    }
                    endContent={
                      viewerId ? (
                        challenge ? (
                          <Button
                            label={date ? "Revisit" : "Try"}
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelected(challenge.slug)}
                          />
                        ) : item.slug === "curious-cat" ? (
                          <Button
                            label="Academy"
                            href="/academy"
                            variant="ghost"
                            size="sm"
                          />
                        ) : item.slug === "first-spark" ? (
                          <Button
                            label="Ideas"
                            href="/ideas"
                            variant="ghost"
                            size="sm"
                          />
                        ) : null
                      ) : undefined
                    }
                  />
                );
              })}
            </List>
          </Step>
        ))}
      </Stepper>
      {selected && viewerId ? (
        <ChallengeDialog
          slug={selected}
          viewerId={viewerId}
          initialInterest={selectedAttempt?.interest}
          initialDepth={selectedAttempt?.depth}
          onClose={() => {
            setSelected(null);
            window.dispatchEvent(new Event("westride:achievements"));
          }}
        />
      ) : null}
    </VStack>
  );
}
