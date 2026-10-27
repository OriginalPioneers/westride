import type { Metadata } from "next";
import { connection } from "next/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { Track } from "@westride/db";
import { listTracksWithLessons } from "@westride/db/client";

export const metadata: Metadata = {
  title: "Academy",
};

const DIFFICULTY_LABEL: Record<Track["difficulty"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

function formatDuration(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return hours === 1 ? "1 hour" : `${value} hours`;
}

function trackSummary(track: Track): string {
  return `${DIFFICULTY_LABEL[track.difficulty]} · ${formatDuration(track.estimatedDurationMinutes)} · ${track.category} · ${track.lessonCount} lessons`;
}

function prerequisiteSummary(
  track: Track,
  catalog: Track[],
): string | null {
  if (track.prerequisiteSlugs.length === 0) {
    return null;
  }

  const names = track.prerequisiteSlugs.map(
    (slug) => catalog.find((item) => item.slug === slug)?.name ?? slug,
  );

  return `Builds on ${names.join(", ")}`;
}

export default async function AcademyPage() {
  await connection();
  const tracks = await listTracksWithLessons();

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>Academy</Heading>
            <Text type="supporting">
              A path from AI fundamentals to launching your own product.
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {tracks.length === 0 ? (
            <Text type="supporting">No tracks yet.</Text>
          ) : (
            <VStack gap={8}>
              {tracks.map((track) => {
                const prerequisites = prerequisiteSummary(track, tracks);

                return (
                  <VStack key={track.id} gap={3}>
                    <Heading level={2}>{track.name}</Heading>
                    <Text type="supporting">{trackSummary(track)}</Text>
                    <Text>{track.description}</Text>
                    {prerequisites ? (
                      <Text type="supporting">{prerequisites}</Text>
                    ) : null}
                    <List
                      edge="flush"
                      hasDividers
                      header={
                        <Heading level={3}>Learning objectives</Heading>
                      }
                    >
                      {track.learningObjectives.map((objective) => (
                        <ListItem
                          key={objective}
                          label={<Text>{objective}</Text>}
                        />
                      ))}
                    </List>
                    <Text type="supporting">
                      Completion badge: {track.achievementTitle}
                    </Text>
                    {track.lessons.length > 0 ? (
                      <List
                        edge="flush"
                        hasDividers
                        header={<Heading level={3}>Lessons</Heading>}
                      >
                        {track.lessons.map((lesson) => (
                          <ListItem key={lesson.id} label={lesson.name} />
                        ))}
                      </List>
                    ) : null}
                  </VStack>
                );
              })}
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}
