import type { Metadata } from "next";
import { connection } from "next/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { listAchievementsForUser } from "@westride/db/client";
import {
  listLearningAttempts,
  syncLearningAwards,
} from "@westride/db/learning";
import { awardIfSignedIn } from "@/lib/achievements";
import { ProfileTabs } from "../../section-tabs";
import { AchievementTrack } from "./achievement-track";
export const metadata: Metadata = { title: "Achievements" };
export default async function AchievementsPage() {
  await connection();
  const userId = await awardIfSignedIn();
  if (userId) await syncLearningAwards(userId);
  const [achievements, attempts] = await Promise.all([
    listAchievementsForUser(userId),
    userId ? listLearningAttempts(userId) : Promise.resolve([]),
  ]);
  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <ProfileTabs />
            <Heading level={1}>Achievements</Heading>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <AchievementTrack
            achievements={achievements}
            attempts={attempts}
            viewerId={userId}
          />
        </LayoutContent>
      }
    />
  );
}
