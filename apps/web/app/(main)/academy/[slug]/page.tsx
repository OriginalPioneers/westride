import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@astryxdesign/core/Badge";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listTrackNamesBySlug } from "@westride/db/client";
import {
  getTrackForAcademy,
  listCompletedLessonIds,
} from "@westride/db/academy";
import { signInPath } from "@/lib/auth-paths";
import {
  DIFFICULTY_BADGE,
  DIFFICULTY_LABEL,
  formatDuration,
  lessonPath,
  pluralize,
  trackPath,
} from "../format";
import { LessonProgress } from "../lesson-progress";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const track = await getTrackForAcademy((await params).slug);
  return { title: track ? `${track.name} · Academy` : "Academy" };
}

export default async function TrackPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [track, { userId }] = await Promise.all([
    getTrackForAcademy(slug),
    auth(),
  ]);
  if (!track) {
    notFound();
  }

  const [completed, prerequisiteRows] = await Promise.all([
    listCompletedLessonIds(userId),
    listTrackNamesBySlug(track.prerequisiteSlugs),
  ]);
  const prerequisiteNames = new Map(
    prerequisiteRows.map((row) => [row.slug, row.name]),
  );

  const total = track.lessons.length;
  const done = track.lessons.filter((lesson) => completed.has(lesson.id)).length;
  const isFinished = total > 0 && done === total;
  const nextLesson =
    track.lessons.find((lesson) => !completed.has(lesson.id)) ??
    track.lessons[0] ??
    null;

  const ctaLabel = !nextLesson
    ? null
    : done === 0
      ? "Start track"
      : isFinished
        ? "Review from the start"
        : `Continue: ${nextLesson.name}`;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href="/academy">Academy</BreadcrumbItem>
              <BreadcrumbItem isCurrent>{track.name}</BreadcrumbItem>
            </Breadcrumbs>
            <VStack gap={2}>
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
              <Heading level={1}>{track.name}</Heading>
              <Text type="supporting">
                {pluralize(total, "lesson")} ·{" "}
                {formatDuration(track.estimatedDurationMinutes)} · Earns the{" "}
                {track.achievementTitle} badge
              </Text>
            </VStack>
            <Text textWrap="pretty">{track.description}</Text>
            {nextLesson && ctaLabel ? (
              <HStack gap={3} vAlign="center" wrap="wrap">
                <Button
                  label={ctaLabel}
                  variant="primary"
                  href={lessonPath(track.slug, nextLesson.slug)}
                  endContent={<Icon icon="chevronRight" />}
                />
                {userId ? (
                  <Text type="supporting">
                    {done} of {total} lessons complete
                  </Text>
                ) : (
                  <Text type="supporting">
                    <Link href={signInPath}>Sign in</Link> to save your
                    progress.
                  </Text>
                )}
              </HStack>
            ) : null}
            {userId && total > 0 ? (
              <LessonProgress
                label={`${track.name} progress`}
                done={done}
                total={total}
                isLabelHidden
              />
            ) : null}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {track.prerequisiteSlugs.length > 0 ? (
              <VStack gap={2}>
                <Heading level={2}>Before you start</Heading>
                <Text type="supporting">
                  This track builds on what you learn in:
                </Text>
                <HStack gap={3} wrap="wrap">
                  {track.prerequisiteSlugs.map((prerequisite) => (
                    <Link
                      key={prerequisite}
                      href={trackPath(prerequisite)}
                      isStandalone
                    >
                      {prerequisiteNames.get(prerequisite) ?? prerequisite}
                    </Link>
                  ))}
                </HStack>
              </VStack>
            ) : null}

            <List
              edge="flush"
              hasDividers
              header={<Heading level={2}>Lessons</Heading>}
            >
              {track.lessons.map((lesson, index) => {
                const isComplete = completed.has(lesson.id);
                return (
                  <ListItem
                    key={lesson.id}
                    href={lessonPath(track.slug, lesson.slug)}
                    align="start"
                    startContent={
                      isComplete ? (
                        <Icon icon="check" color="success" label="Completed" />
                      ) : (
                        <Text type="supporting" hasTabularNumbers>
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      )
                    }
                    label={<Text weight="medium">{lesson.name}</Text>}
                    description={
                      <VStack gap={0.5}>
                        <Text type="supporting" textWrap="pretty">
                          {lesson.summary}
                        </Text>
                        <Text type="supporting">
                          {formatDuration(lesson.estimatedDurationMinutes)}
                          {isComplete ? " · Completed" : ""}
                        </Text>
                      </VStack>
                    }
                    endContent={<Icon icon="chevronRight" color="tertiary" />}
                  />
                );
              })}
            </List>

            <List
              edge="flush"
              hasDividers
              header={<Heading level={2}>What you will learn</Heading>}
            >
              {track.learningObjectives.map((objective) => (
                <ListItem
                  key={objective}
                  align="first-line"
                  startContent={<Icon icon="check" color="accent" />}
                  label={<Text>{objective}</Text>}
                />
              ))}
            </List>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
