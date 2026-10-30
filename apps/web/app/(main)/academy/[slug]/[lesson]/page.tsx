import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@astryxdesign/core/Badge";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getLesson, listLessonCompletions } from "@westride/db/academy";
import { formatDuration, theaterPath, trackPath } from "../../format";
import { LessonBody } from "../../lesson-body";
import { TheaterModeButton } from "../../theater-mode-button";

type Params = Promise<{ slug: string; lesson: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, lesson: lessonSlug } = await params;
  const lesson = await getLesson(slug, lessonSlug);
  return {
    title: lesson ? `${lesson.name} · ${lesson.track.name}` : "Lesson",
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { slug, lesson: lessonSlug } = await params;
  const [lesson, { userId }] = await Promise.all([
    getLesson(slug, lessonSlug),
    auth(),
  ]);
  if (!lesson) {
    notFound();
  }

  const completions = await listLessonCompletions(userId, [lesson.id]);
  const completedAt = completions.get(lesson.id) ?? null;

  return (
    <Layout
      contentWidth={800}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href="/academy">Academy</BreadcrumbItem>
              <BreadcrumbItem href={trackPath(lesson.track.slug)}>
                {lesson.track.name}
              </BreadcrumbItem>
              <BreadcrumbItem isCurrent>{lesson.name}</BreadcrumbItem>
            </Breadcrumbs>
            <HStack gap={4} vAlign="start" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Text type="supporting">
                      Lesson {lesson.position} of {lesson.track.lessonCount} ·{" "}
                      {formatDuration(lesson.estimatedDurationMinutes)}
                    </Text>
                    {completedAt ? (
                      <Badge
                        variant="success"
                        label="Completed"
                        icon={<Icon icon="check" />}
                      />
                    ) : null}
                  </HStack>
                  <Heading level={1}>{lesson.name}</Heading>
                  <Text type="supporting" textWrap="pretty">
                    {lesson.summary}
                  </Text>
                </VStack>
              </StackItem>
              <StackItem size="static">
                <TheaterModeButton
                  href={theaterPath(lesson.track.slug, lesson.slug)}
                />
              </StackItem>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <LessonBody
            lesson={lesson}
            viewerId={userId}
            completedAt={completedAt}
            mode="page"
          />
        </LayoutContent>
      }
    />
  );
}
