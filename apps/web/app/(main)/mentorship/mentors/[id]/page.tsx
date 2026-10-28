import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { getMentorProfile } from "@westride/db/mentorship";
import { languageName } from "@/lib/mentorship/languages";
import { formatLocation } from "@/lib/mentorship/locations";
import { mentorPath, skillFilterPath } from "../mentor-card";

type Params = Promise<{ id: string }>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadMentor(id: string) {
  return UUID.test(id) ? getMentorProfile(id) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { userId } = await auth();
  if (!userId) {
    return { title: "Mentor" };
  }
  const mentor = await loadMentor((await params).id);
  return { title: mentor?.displayName ?? "Mentor" };
}

export default async function MentorPage({ params }: { params: Params }) {
  const { id } = await params;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: mentorPath(id) });
  }

  const mentor = await loadMentor(id);
  if (!mentor) {
    notFound();
  }

  const isOwnProfile = mentor.clerkUserId === userId;
  const paragraphs = mentor.bio.split(/\n+/).filter((line) => line.trim());
  const links = [
    { label: "GitHub", href: mentor.githubUrl },
    { label: "LinkedIn", href: mentor.linkedinUrl },
    { label: "Facebook", href: mentor.facebookUrl },
  ].filter((link): link is { label: string; href: string } =>
    Boolean(link.href),
  );

  return (
    <Layout
      contentWidth={800}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <Link href="/mentorship/mentors" isStandalone>
              All mentors
            </Link>
            <HStack gap={5} vAlign="center" wrap="wrap">
              <Avatar
                src={mentor.headshotUrl ?? undefined}
                name={mentor.displayName}
                size="xl"
                tooltip={false}
              />
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>{mentor.displayName}</Heading>
                  {mentor.languageCodes.length > 0 ? (
                    <Text type="supporting">
                      Speaks {mentor.languageCodes.map(languageName).join(", ")}
                    </Text>
                  ) : null}
                </VStack>
              </StackItem>
              {isOwnProfile ? (
                <Button
                  label="Edit your profile"
                  variant="primary"
                  href="/mentorship/become"
                />
              ) : null}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            <VStack gap={3}>
              <Heading level={2}>About</Heading>
              {paragraphs.map((paragraph, index) => (
                <Text key={index} as="p" display="block">
                  {paragraph}
                </Text>
              ))}
            </VStack>

            {mentor.skills.length > 0 ? (
              <VStack gap={3}>
                <Heading level={2}>Skills</Heading>
                <HStack gap={2} wrap="wrap">
                  {mentor.skills.map((skill) => (
                    <Token
                      key={skill.id}
                      label={skill.name}
                      href={skillFilterPath(skill.slug)}
                    />
                  ))}
                </HStack>
              </VStack>
            ) : null}

            <VStack gap={3}>
              <Heading level={2}>Locations</Heading>
              <VStack gap={1}>
                {mentor.isGlobal ? (
                  <Text>Mentors globally, wherever you are</Text>
                ) : null}
                {mentor.locations.map((location) => (
                  <Text key={location.id}>{formatLocation(location)}</Text>
                ))}
              </VStack>
            </VStack>

            {links.length > 0 ? (
              <>
                <Divider />
                <VStack gap={3}>
                  <Heading level={2}>Connect</Heading>
                  <HStack gap={5} wrap="wrap">
                    {links.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        isExternalLink
                        isStandalone
                      >
                        {link.label}
                      </Link>
                    ))}
                  </HStack>
                </VStack>
              </>
            ) : null}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
