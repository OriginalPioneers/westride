"use client";
import { Theme } from "@astryxdesign/core/theme";
import {
  achievementTheme,
  journeyGradient,
  bonusBadgeStyle,
} from "./achievement-theme";
import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { SocialDialog } from "./social-dialog";
import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, VStack, StackItem } from "@astryxdesign/core/Stack";
import { Stepper, Step } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import {
  achievementCatalog,
  mainAchievementCatalog,
  achievementGroups,
} from "@westride/db";
import { challengeCatalog } from "@westride/db/challenges";
import type { AchievementWithProgress } from "@westride/db/client";
import type { LearningAttempt } from "@westride/db/learning";
import { signInPath } from "@/lib/auth-paths";
import { achievementIcons } from "./achievement-icons";
import { ChallengeDialog } from "./challenge-dialog";
import { MuseCompanion } from "./muse-companion";
import {
  trackProgress,
  challengeMilestones,
  revisionMilestones,
  milestoneHint,
  type ChallengeSelection,
} from "./track-progress";

const sectionColors = [
  "var(--color-journey-indigo)",
  "var(--color-journey-purple)",
  "var(--color-journey-blue)",
  "var(--color-journey-teal)",
  "var(--color-journey-red)",
] as const;

const challengeDescriptions: Record<string, string> = {
  "clear-intent": "Name your goal and what a useful answer looks like.",
  "context-counts": "Give AI the details it needs to help.",
  "step-by-step": "Break a task into three clear steps.",
  "set-the-boundaries": "Give your request two useful limits.",
  "teach-it-back": "Explain something in your own words.",
  "ask-for-evidence": "Decide what evidence would make a claim trustworthy.",
  "problem-finder": "Notice a small problem worth solving.",
  "people-first": "Connect an idea to the people it could help.",
  "what-if": "Change one assumption and explore a possibility.",
  "two-ways": "Compare two approaches and a tradeoff.",
  "start-small": "Choose the smallest version you could try.",
  "human-in-charge": "Decide which AI suggestions to keep or reject.",
};

export function AchievementTrack({
  achievements,
  attempts,
  viewerId,
}: {
  achievements: AchievementWithProgress[];
  attempts: LearningAttempt[];
  viewerId: string | null;
}) {
  const [socialOpen, setSocialOpen] = useState(false);
  const [selected, setSelected] = useState<ChallengeSelection | null>(null);
  const earned = new Set(
    achievements.filter((a) => a.earnedAt).map((a) => a.slug),
  );
  const progress = trackProgress(attempts, earned, Boolean(viewerId));
  const { next } = progress;
  const mainEarned = mainAchievementCatalog.filter((a) =>
    earned.has(a.slug),
  ).length;
  const bonus = achievementCatalog.filter((a) => a.group === "Get social");
  const bonusEarned = bonus.filter((a) => earned.has(a.slug)).length;
  const groups = achievementGroups
    .filter((group) => group !== "Get social")
    .map((group) => ({
      group,
      items: achievementCatalog.filter((a) => a.group === group),
    }));
  const firstIncomplete = groups.findIndex(({ items }) =>
    items.some((a) => !earned.has(a.slug)),
  );
  function openChallenge(slug: string) {
    const attempt =
      attempts.find((a) => a.challengeSlug === slug && !a.completedAt) ??
      attempts.find((a) => a.challengeSlug === slug);
    setSelected({
      slug,
      interest: attempt?.interest ?? "games",
      depth: attempt?.depth ?? "simple",
    });
  }
  return (
    <Theme theme={achievementTheme}>
      <VStack gap={6}>
        <HStack gap={4} vAlign="center">
          <VStack
            data-muse-top
            gap={1}
            hAlign="center"
            style={{ width: "calc(var(--spacing-12) * 2)", flexShrink: 0 }}
          >
            <ClickableCard
              label="Ask Muse"
              padding={0}
              elevation="none"
              width="100%"
              style={{ backgroundColor: "transparent", border: 0 }}
              onClick={() =>
                window.dispatchEvent(new Event("westride:open-muse"))
              }
            >
              <MuseCompanion />
            </ClickableCard>
            <Text type="supporting" size="xsm" style={{ textAlign: "center" }}>
              Need a nudge?
              <br />
              Ask Muse.
            </Text>
          </VStack>
          <StackItem size="fill">
            <VStack gap={2} hAlign="start">
              <Text
                type="label"
                color="accent"
                style={{ color: "var(--color-journey-purple)" }}
              >
                Next up
              </Text>
              <Heading level={2}>{next.title}</Heading>
              <Text>{next.description}</Text>
              {next.unlocks.length ? (
                <Text type="supporting">
                  {next.href
                    ? "Unlocks"
                    : next.label === "Revisit answer"
                      ? "Revise to unlock"
                      : "Finish to unlock"}
                  : {next.unlocks.join(" · ")}
                </Text>
              ) : null}
              <Button
                label={next.label}
                variant="primary"
                href={!viewerId ? signInPath : next.href}
                onClick={
                  next.challenge
                    ? () => setSelected(next.challenge!)
                    : undefined
                }
              />
            </VStack>
          </StackItem>
        </HStack>

        <VStack gap={4}>
          <ProgressBar
            label="Your achievements"
            value={mainEarned}
            max={mainAchievementCatalog.length}
            hasValueLabel
            variant={
              mainEarned === mainAchievementCatalog.length
                ? "success"
                : "accent"
            }
            formatValueLabel={(value, max) => `${value} of ${max} earned`}
          />
          <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
            <VStack gap={2}>
              <ProgressBar
                label="Challenge milestones"
                value={progress.completed.size}
                max={12}
                marks={challengeMilestones}
                hasValueLabel
                variant={progress.completed.size === 12 ? "success" : "accent"}
                formatValueLabel={(value, max) => `${value} / ${max}`}
              />
              <Text type="supporting">
                {milestoneHint(
                  progress.completed.size,
                  challengeMilestones,
                  "challenge",
                )}
              </Text>
            </VStack>
            <VStack gap={2}>
              <ProgressBar
                label="Revision milestones"
                value={Math.min(progress.revised.size, 3)}
                max={3}
                marks={revisionMilestones}
                hasValueLabel
                variant={progress.revised.size >= 3 ? "success" : "accent"}
                formatValueLabel={(value, max) => `${value} / ${max}`}
              />
              <Text type="supporting">
                {milestoneHint(
                  progress.revised.size,
                  revisionMilestones,
                  "revision",
                )}
              </Text>
            </VStack>
          </Grid>
        </VStack>

        <Stepper
          orientation="vertical"
          indicatorPosition="on-track"
          density="compact"
          activeStep={firstIncomplete < 0 ? groups.length : firstIncomplete}
          label="Your learning track"
        >
          {groups.map(({ group, items }, index) => {
            const count = items.filter((a) => earned.has(a.slug)).length;
            return (
              <Step
                key={group}
                step={index}
                style={
                  {
                    "--journey-section-color": sectionColors[index],
                  } as React.CSSProperties
                }
                label={group}
                description={
                  count === items.length
                    ? `All ${items.length} earned`
                    : `${count} of ${items.length} earned${count === items.length - 1 ? " · One away from completing this group" : ""}`
                }
              >
                <List edge="flush" density="compact" hasDividers>
                  {items.map((item) => {
                    const state = progress.state(item.slug);
                    const challenge = challengeCatalog.find(
                      (c) => c.slug === item.slug,
                    );
                    const color =
                      state === "Earned"
                        ? "success"
                        : state === "In progress"
                          ? "accent"
                          : "secondary";
                    const locked =
                      state === "Needs feedback" ||
                      state === "Sign in" ||
                      state === "Needs an idea";
                    return (
                      <ListItem
                        key={item.slug}
                        align="first-line"
                        label={
                          <HStack gap={2} vAlign="center" wrap="wrap">
                            <Text type="label" weight="semibold">
                              {item.name}
                            </Text>
                            <HStack gap={1} vAlign="center">
                              <Icon
                                icon={
                                  state === "Earned"
                                    ? "check"
                                    : state === "In progress"
                                      ? "clock"
                                      : locked
                                        ? LockClosedIcon
                                        : "chevronRight"
                                }
                                color={color}
                                style={
                                  state === "Earned"
                                    ? { color: sectionColors[index] }
                                    : state === "In progress"
                                      ? { color: sectionColors[index] }
                                      : undefined
                                }
                                size="xsm"
                              />
                              <Text
                                type="supporting"
                                style={
                                  state === "Earned"
                                    ? { color: sectionColors[index] }
                                    : state === "In progress"
                                      ? { color: sectionColors[index] }
                                      : undefined
                                }
                                color={
                                  state === "In progress"
                                    ? "accent"
                                    : "secondary"
                                }
                              >
                                {state === "Sign in" ? null : state}
                              </Text>
                            </HStack>
                          </HStack>
                        }
                        startContent={
                          <Icon
                            icon={achievementIcons[item.slug]}
                            size="lg"
                            color={color}
                            style={{ color: sectionColors[index] }}
                          />
                        }
                        description={
                          <Text type="supporting">
                            {progress.detail(item.slug) ??
                              challengeDescriptions[item.slug] ??
                              item.description}
                          </Text>
                        }
                        endContent={
                          viewerId ? (
                            challenge ? (
                              <Button
                                label={
                                  state === "Earned"
                                    ? "Revisit"
                                    : state === "In progress"
                                      ? "Continue"
                                      : "Try"
                                }
                                variant="ghost"
                                size="sm"
                                onClick={() => openChallenge(challenge.slug)}
                              />
                            ) : item.slug === "curious-cat" ? (
                              <Button
                                label="Academy"
                                href="/academy"
                                variant="ghost"
                                size="sm"
                              />
                            ) : item.slug === "first-spark" ||
                              item.group === "Build something real" ? (
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
            );
          })}
          <Step
            step={groups.length}
            label="Continue the journey!"
            style={
              {
                "--journey-section-color": "var(--color-journey-red)",
              } as React.CSSProperties
            }
          />
        </Stepper>
        <Divider />
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Heading
              level={2}
              style={{
                backgroundImage: journeyGradient,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Get social
            </Heading>
            <Badge label="BONUS" variant="purple" style={bonusBadgeStyle} />
          </HStack>
          <Text type="supporting">
            Share what you’re making, find your voice, and learn from feedback.
            This optional track doesn’t count toward your main journey.
            Published posts and audience feedback are confirmed by you.
          </Text>
          <ProgressBar
            label="Bonus achievements"
            value={bonusEarned}
            max={bonus.length}
            hasValueLabel
            formatValueLabel={(v, max) => `${v} of ${max} earned`}
          />
          <List edge="flush" density="compact" hasDividers>
            {bonus.map((item) => (
              <ListItem
                key={item.slug}
                startContent={
                  <Icon
                    icon={achievementIcons[item.slug]}
                    size="lg"
                    color={earned.has(item.slug) ? "success" : "secondary"}
                    style={{ color: "var(--color-journey-blue)" }}
                  />
                }
                label={
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Text type="label" weight="semibold">
                      {item.name}
                    </Text>
                    <Text
                      type="supporting"
                      style={
                        earned.has(item.slug)
                          ? { color: "var(--color-journey-teal)" }
                          : undefined
                      }
                    >
                      {earned.has(item.slug) ? "Earned" : "Optional"}
                    </Text>
                  </HStack>
                }
                description={<Text type="supporting">{item.description}</Text>}
              />
            ))}
          </List>
          <Button
            label="Make a post with Muse"
            variant="secondary"
            href={!viewerId ? signInPath : undefined}
            onClick={viewerId ? () => setSocialOpen(true) : undefined}
          />
        </VStack>
        {socialOpen && viewerId ? (
          <SocialDialog
            onClose={() => {
              setSocialOpen(false);
              window.dispatchEvent(new Event("westride:achievements"));
            }}
          />
        ) : null}
        {selected && viewerId ? (
          <ChallengeDialog
            slug={selected.slug}
            viewerId={viewerId}
            initialInterest={selected.interest}
            initialDepth={selected.depth}
            initialAttempt={attempts.find(
              (a) =>
                a.challengeSlug === selected.slug &&
                a.interest === selected.interest,
            )}
            onClose={() => {
              setSelected(null);
              window.dispatchEvent(new Event("westride:achievements"));
            }}
          />
        ) : null}
      </VStack>
    </Theme>
  );
}
