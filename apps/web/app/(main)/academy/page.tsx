import type { Metadata } from "next";
import { connection } from "next/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listTracksWithLessons } from "@westride/db/client";

export const metadata: Metadata = {
  title: "Academy",
};

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
              Learning tracks and the lessons in each one.
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
              {tracks.map((track) =>
                track.lessons.length === 0 ? (
                  <VStack key={track.id} gap={3}>
                    <Heading level={2}>{track.name}</Heading>
                    <Text type="supporting">No lessons yet.</Text>
                  </VStack>
                ) : (
                  <List
                    key={track.id}
                    edge="flush"
                    hasDividers
                    header={<Heading level={2}>{track.name}</Heading>}
                  >
                    {track.lessons.map((lesson) => (
                      <ListItem key={lesson.id} label={lesson.name} />
                    ))}
                  </List>
                ),
              )}
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}
