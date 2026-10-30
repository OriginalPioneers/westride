import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@astryxdesign/core/Badge";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ACHIEVEMENT_SLUG } from "@westride/db";
import {
  listCompletedLessonIds,
  listTracksForAcademy,
  type TrackWithLessonSummaries,
} from "@westride/db/academy";
import { awardIfSignedIn } from "@/lib/achievements";
import { signInPath } from "@/lib/auth-paths";
import {
  DIFFICULTY_BADGE,
  DIFFICULTY_LABEL,
  formatDuration,
  pluralize,
  trackPath,
} from "./format";
import { LessonProgress } from "./lesson-progress";

export const metadata: Metadata = {
  title: "Academy",
};

function completedCount(
  track: TrackWithLessonSummaries,
  completed: Set<string>,
): number {
  return track.lessons.filter((lesson) => completed.has(lesson.id)).length;
}

export default async function AcademyPage() {
  await connection();
  await awardIfSignedIn(ACHIEVEMENT_SLUG.curiousCat);
  const { userId } = await auth();
  const [tracks, completed] = await Promise.all([
    listTracksForAcademy(),
    listCompletedLessonIds(userId),
  ]);

  const totalLessons = tracks.reduce(
    (sum, track) => sum + track.lessons.length,
    0,
  );
  const totalMinutes = tracks.reduce(
    (sum, track) => sum + track.estimatedDurationMinutes,
    0,
  );
  const tracksFinished = tracks.filter(
    (track) =>
      track.lessons.length > 0 &&
      completedCount(track, completed) === track.lessons.length,
  ).length;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={1}>Academy</Heading>
              <Text type="supporting">
                A path from AI fundamentals to launching your own product.
                {" "}
                {pluralize(tracks.length, "track")} ·{" "}
                {pluralize(totalLessons, "lesson")} ·{" "}
                {formatDuration(totalMinutes)} in total.
              </Text>
            </VStack>
            {userId ? (
              <LessonProgress
                label="Your Academy progress"
                done={completed.size}
                total={totalLessons}
                suffix={`${pluralize(tracksFinished, "track")} finished`}
              />
            ) : (
              <Text type="supporting">
                <Link href={signInPath}>Sign in</Link> to track which lessons
                you have completed.
              </Text>
            )}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {tracks.length === 0 ? (
            <Text type="supporting">No tracks yet.</Text>
          ) : (
            <Grid columns={{ minWidth: 300, max: 2 }} gap={4}>
              {tracks.map((track) => {
                const done = completedCount(track, completed);
                const total = track.lessons.length;
                const isFinished = total > 0 && done === total;
                return (
                  <ClickableCard
                    key={track.id}
                    label={`Open ${track.name}`}
                    href={trackPath(track.slug)}
                    elevation="low"
                    padding={5}
                  >
                    <VStack gap={3} height="100%">
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Badge
                          variant={DIFFICULTY_BADGE[track.difficulty]}
                          label={DIFFICULTY_LABEL[track.difficulty]}
                        />
                        <Badge variant="neutral" label={track.category} />
                        {isFinished ? (
                          <Badge variant="success" label="Completed" />
                        ) : null}
                      </HStack>
                      <Heading level={2}>{track.name}</Heading>
                      <Text type="supporting">
                        {pluralize(total, "lesson")} ·{" "}
                        {formatDuration(track.estimatedDurationMinutes)}
                      </Text>
                      <Text textWrap="pretty">{track.description}</Text>
                      {userId ? (
                        <LessonProgress
                          label={`${track.name} progress`}
                          done={done}
                          total={total}
                          isLabelHidden
                        />
                      ) : null}
                    </VStack>
                  </ClickableCard>
                );
              })}
            </Grid>
          )}
        </LayoutContent>
      }
    />
  );
}
