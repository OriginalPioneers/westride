import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Heading } from "@astryxdesign/core/Heading";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
} from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getLesson, listLessonCompletions } from "@westride/db/academy";
import {
  formatDuration,
  lessonPath,
  theaterPath,
} from "@/app/(main)/academy/format";
import { LessonBody } from "@/app/(main)/academy/lesson-body";
import { TheaterControls } from "./theater-controls";

type Params = Promise<{ slug: string; lesson: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, lesson: lessonSlug } = await params;
  const lesson = await getLesson(slug, lessonSlug);
  return {
    title: lesson ? `${lesson.name} · Theater` : "Theater",
  };
}

export default async function LessonTheaterPage({
  params,
}: {
  params: Params;
}) {
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
  const trackSlug = lesson.track.slug;

  return (
    <Layout
      height="fill"
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <Text type="supporting" maxLines={1}>
                {lesson.track.name} · Lesson {lesson.position} of{" "}
                {lesson.track.lessonCount} ·{" "}
                {formatDuration(lesson.estimatedDurationMinutes)}
              </Text>
            </StackItem>
            <TheaterControls
              exitHref={lessonPath(trackSlug, lesson.slug)}
              previousHref={
                lesson.previous ? theaterPath(trackSlug, lesson.previous.slug) : null
              }
              nextHref={lesson.next ? theaterPath(trackSlug, lesson.next.slug) : null}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable padding={8}>
          <VStack gap={8}>
            <Heading level={1} textWrap="balance">
              {lesson.name}
            </Heading>
            <LessonBody
              lesson={lesson}
              viewerId={userId}
              completedAt={completedAt}
              mode="theater"
            />
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter hasDivider>
          <Text type="supporting" justify="center" as="p">
            Esc exits · ← → change lesson · F toggles fullscreen
          </Text>
        </LayoutFooter>
      }
    />
  );
}
