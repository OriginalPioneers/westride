import type { Metadata } from "next";
import { connection } from "next/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { listAchievementsForUser } from "@westride/db/client";
import {
  listLearningAttempts,
  syncLearningAwards,
} from "@westride/db/learning";
import { awardIfSignedIn } from "@/lib/achievements";
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
          <Heading level={1}>Achievements</Heading>
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
