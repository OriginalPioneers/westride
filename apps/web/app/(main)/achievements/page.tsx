import type { Metadata } from "next";
import { connection } from "next/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { listAchievementsForUser } from "@westride/db/client";
import { awardIfSignedIn } from "@/lib/achievements";
import { signInPath } from "@/lib/auth-paths";

export const metadata: Metadata = {
  title: "Achievements",
};

function formatEarned(earnedAt: Date): string {
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(earnedAt);
  return `Earned ${label}`;
}

export default async function AchievementsPage() {
  await connection();
  const userId = await awardIfSignedIn();
  const achievements = await listAchievementsForUser(userId);
  const earnedCount = achievements.filter((achievement) => achievement.earnedAt)
    .length;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>Achievements</Heading>
            <Text type="supporting">
              {userId ? (
                `You have earned ${earnedCount} of ${achievements.length}.`
              ) : (
                <>
                  <Link href={signInPath} hasUnderline>
                    Sign in
                  </Link>{" "}
                  to earn badges. Guests can look, but only a signed-in account
                  can earn them.
                </>
              )}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {achievements.length === 0 ? (
            <Text type="supporting">No achievements yet.</Text>
          ) : (
            <List
              edge="flush"
              hasDividers
              header={<Heading level={2}>Badges</Heading>}
            >
              {achievements.map((achievement) => (
                <ListItem
                  key={achievement.id}
                  label={achievement.name}
                  description={
                    <Text type="supporting">{achievement.description}</Text>
                  }
                  startContent={
                    <Thumbnail
                      src={achievement.badgeUrl}
                      alt=""
                      label={achievement.name}
                    />
                  }
                  endContent={
                    userId ? (
                      <Text type="supporting">
                        {achievement.earnedAt
                          ? formatEarned(achievement.earnedAt)
                          : "Not earned yet"}
                      </Text>
                    ) : undefined
                  }
                />
              ))}
            </List>
          )}
        </LayoutContent>
      }
    />
  );
}
