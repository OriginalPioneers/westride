import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { LessonWithContext } from "@westride/db/academy";
import { signInPath } from "@/lib/auth-paths";
import { lessonPath, theaterPath } from "./format";
import { LessonCompleteButton } from "./lesson-complete-button";
import { LessonContent } from "./lesson-content";

export function LessonBody({
  lesson,
  viewerId,
  completedAt,
  mode,
}: {
  lesson: LessonWithContext;
  viewerId: string | null;
  completedAt: Date | null;
  /** Theater mode links stay in theater mode between lessons. */
  mode: "page" | "theater";
}) {
  const hrefFor = mode === "theater" ? theaterPath : lessonPath;
  const trackSlug = lesson.track.slug;
  const nextHref = lesson.next ? hrefFor(trackSlug, lesson.next.slug) : null;

  return (
    <VStack gap={8}>
      <LessonContent content={lesson.content} artifacts={lesson.artifacts} />

      {lesson.keyTakeaways.length > 0 ? (
        <List
          edge="flush"
          hasDividers
          header={<Heading level={2}>Key takeaways</Heading>}
        >
          {lesson.keyTakeaways.map((takeaway) => (
            <ListItem
              key={takeaway}
              align="first-line"
              startContent={<Icon icon="check" color="accent" />}
              label={<Text>{takeaway}</Text>}
            />
          ))}
        </List>
      ) : null}

      <Divider />

      {viewerId ? (
        <LessonCompleteButton
          lessonId={lesson.id}
          isComplete={completedAt !== null}
          completedAt={completedAt?.toISOString() ?? null}
          nextHref={nextHref}
          nextLabel={lesson.next?.name ?? null}
        />
      ) : (
        <Text type="supporting">
          <Link href={signInPath}>Sign in</Link> to mark lessons complete and
          track your progress through the Academy.
        </Text>
      )}

      <HStack gap={3} vAlign="center" wrap="wrap">
        {lesson.previous ? (
          <Button
            label={lesson.previous.name}
            variant="ghost"
            href={hrefFor(trackSlug, lesson.previous.slug)}
            icon={<Icon icon="chevronLeft" />}
          />
        ) : null}
        <StackItem size="fill">
          <Text type="supporting" justify="center" as="p">
            Lesson {lesson.position} of {lesson.track.lessonCount}
          </Text>
        </StackItem>
        {lesson.next ? (
          <Button
            label={lesson.next.name}
            variant="ghost"
            href={hrefFor(trackSlug, lesson.next.slug)}
            endContent={<Icon icon="chevronRight" />}
          />
        ) : null}
      </HStack>
    </VStack>
  );
}
