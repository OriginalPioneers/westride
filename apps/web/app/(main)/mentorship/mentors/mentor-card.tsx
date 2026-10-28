import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import type { MentorWithDetails } from "@westride/db/mentorship";
import { languageName } from "@/lib/mentorship/languages";
import { summarizeLocations } from "@/lib/mentorship/locations";

const VISIBLE_SKILLS = 5;

export function mentorPath(id: string): string {
  return `/mentorship/mentors/${id}`;
}

export function skillFilterPath(slug: string): string {
  return `/mentorship/mentors?skill=${encodeURIComponent(slug)}`;
}

export function MentorCard({ mentor }: { mentor: MentorWithDetails }) {
  const shownSkills = mentor.skills.slice(0, VISIBLE_SKILLS);
  const hiddenSkillCount = mentor.skills.length - shownSkills.length;
  const location = summarizeLocations(mentor.locations, mentor.isGlobal);

  return (
    <Card>
      <VStack gap={4}>
        <HStack gap={3} vAlign="center">
          <Avatar
            src={mentor.headshotUrl ?? undefined}
            name={mentor.displayName}
            size="lg"
            tooltip={false}
          />
          <StackItem size="fill">
            <VStack gap={0.5}>
              <Heading level={3} maxLines={1}>
                <Link href={mentorPath(mentor.id)}>{mentor.displayName}</Link>
              </Heading>
              {location ? (
                <Text type="supporting" maxLines={1}>
                  {location}
                </Text>
              ) : null}
            </VStack>
          </StackItem>
        </HStack>
        <Text maxLines={3}>{mentor.bio}</Text>
        {shownSkills.length > 0 ? (
          <HStack gap={1} wrap="wrap" vAlign="center">
            {shownSkills.map((skill) => (
              <Token
                key={skill.id}
                label={skill.name}
                size="sm"
                href={skillFilterPath(skill.slug)}
              />
            ))}
            {hiddenSkillCount > 0 ? (
              <Text type="supporting">+{hiddenSkillCount} more</Text>
            ) : null}
          </HStack>
        ) : null}
        {mentor.languageCodes.length > 0 ? (
          <Text type="supporting">
            Speaks {mentor.languageCodes.map(languageName).join(", ")}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}
