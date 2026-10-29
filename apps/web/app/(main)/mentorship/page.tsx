import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getMentorProfileForUser } from "@westride/db/mentorship";
import { BecomeMentorIcon, FindMentorIcon } from "./mentorship-icons";
import { mentorPath } from "./mentors/mentor-card";

export const metadata: Metadata = {
  title: "Mentorship",
};

export default async function MentorshipPage() {
  const { userId } = await auth();
  const profile = userId ? await getMentorProfileForUser(userId) : null;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>Mentorship</Heading>
            <Text type="supporting">
              Free, one-to-one guidance from builders, founders, and engineers
              in the WeStride community.
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
            <Card>
              <VStack gap={4}>
                <BecomeMentorIcon />
                <VStack gap={1}>
                  <Heading level={2}>
                    {profile ? "You are a mentor" : "Become a Mentor"}
                  </Heading>
                  <Text type="supporting">
                    {profile
                      ? "Keep your skills, locations, and languages current so the right mentees find you."
                      : userId
                        ? "Share what you know. List your skills, where you are, and the languages you speak."
                        : "Share what you know. An account is required to list your skills, where you are, and the languages you speak."}
                  </Text>
                </VStack>
                <HStack gap={2} wrap="wrap">
                  <Button
                    label={profile ? "Edit your profile" : "Become a Mentor"}
                    variant="primary"
                    href="/mentorship/become"
                  />
                  {profile ? (
                    <Button
                      label="View your profile"
                      href={mentorPath(profile.id)}
                    />
                  ) : null}
                </HStack>
              </VStack>
            </Card>
            <Card>
              <VStack gap={4}>
                <FindMentorIcon />
                <VStack gap={1}>
                  <Heading level={2}>Find a Mentor</Heading>
                  <Text type="supporting">
                    Browse mentors and narrow them down by skill, location, and
                    language.
                  </Text>
                </VStack>
                <HStack>
                  <Button
                    label="Find a Mentor"
                    variant={profile ? "primary" : "secondary"}
                    href="/mentorship/mentors"
                  />
                </HStack>
              </VStack>
            </Card>
          </Grid>
        </LayoutContent>
      }
    />
  );
}
