import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import {
  MetadataList,
  MetadataListItem,
} from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import { getGithubConnection } from "@westride/db/github";
import { listIdeasForMember } from "@westride/db/ideas";
import { getMentorProfileForUser } from "@westride/db/mentorship";
import { IDEA_ROLE_LABELS, IDEA_TYPE_LABELS, ideaPath } from "@/lib/ideas/filters";
import { languageName } from "@/lib/mentorship/languages";
import { summarizeLocations } from "@/lib/mentorship/locations";
import { mentorPath, skillFilterPath } from "../mentorship/mentors/mentor-card";
import { AccountTabs } from "../section-tabs";
import { EditAccountButton, SignOutButton } from "./profile-widgets";

export const metadata: Metadata = {
  title: "Profile",
};

const VISIBLE_SKILLS = 6;

/** GitHub usernames are 1–39 characters, alphanumeric or hyphen, and cannot start or end with a hyphen. */
function githubProfileUrl(login: string): string | null {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(login)) {
    return null;
  }
  return `https://github.com/${login}`;
}

/** Clerk reports account creation as seconds or milliseconds since the epoch. */
function isoFromClerkTime(value: number): string {
  const millis = value < 1_000_000_000_000 ? value * 1000 : value;
  return new Date(millis).toISOString();
}

export default async function ProfilePage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/profile" });
  }

  const [account, ideas, mentor, github] = await Promise.all([
    currentUser(),
    listIdeasForMember(userId),
    getMentorProfileForUser(userId),
    getGithubConnection(userId),
  ]);

  const name = account?.fullName || account?.username || "Your profile";
  const username =
    account?.username && account.username !== name ? account.username : null;
  const memberSince = account?.createdAt
    ? isoFromClerkTime(account.createdAt)
    : null;
  const githubUrl = github ? githubProfileUrl(github.login) : null;
  const githubLogin = githubUrl ? github?.login : null;
  const location = mentor
    ? summarizeLocations(mentor.locations, mentor.isGlobal)
    : "";
  const shownSkills = mentor?.skills.slice(0, VISIBLE_SKILLS) ?? [];
  const hiddenSkillCount = (mentor?.skills.length ?? 0) - shownSkills.length;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <AccountTabs />
            <HStack gap={5} vAlign="center" wrap="wrap">
              <Avatar
                src={account?.hasImage ? account.imageUrl : undefined}
                name={name}
                size="xl"
                tooltip={false}
              />
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>{name}</Heading>
                  {username ? (
                    <Text type="supporting">@{username}</Text>
                  ) : null}
                </VStack>
              </StackItem>
              <HStack gap={2} wrap="wrap">
                <EditAccountButton />
                <SignOutButton />
              </HStack>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {memberSince || githubUrl ? (
              <MetadataList columns={2}>
                {memberSince ? (
                  <MetadataListItem label="Member since">
                    <Timestamp value={memberSince} format="date" />
                  </MetadataListItem>
                ) : null}
                {githubUrl && githubLogin ? (
                  <MetadataListItem label="GitHub">
                    <Link href={githubUrl} isExternalLink>
                      {githubLogin}
                    </Link>
                  </MetadataListItem>
                ) : null}
              </MetadataList>
            ) : null}

            <Grid columns={{ minWidth: 180, max: 2 }} gap={4}>
              <ClickableCard
                label={
                  ideas.length === 1 ? "1 idea" : `${ideas.length} ideas`
                }
                href="/ideas"
              >
                <VStack gap={1}>
                  <Heading level={2}>{ideas.length}</Heading>
                  <Text type="supporting">
                    {ideas.length === 1 ? "Idea" : "Ideas"}
                  </Text>
                </VStack>
              </ClickableCard>
              <ClickableCard
                label={mentor ? "You are a mentor" : "You are not a mentor yet"}
                href={mentor ? mentorPath(mentor.id) : "/mentorship"}
              >
                <VStack gap={1}>
                  <Heading level={2}>{mentor ? "Listed" : "Not yet"}</Heading>
                  <Text type="supporting">Mentor directory</Text>
                </VStack>
              </ClickableCard>
            </Grid>

            <Divider />

            <VStack gap={4}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Ideas</Heading>
                </StackItem>
                <Button
                  label="Idea Workshop"
                  href="/ideas"
                  variant="ghost"
                  size="sm"
                />
              </HStack>
              {ideas.length === 0 ? (
                <EmptyState
                  title="No ideas yet"
                  description="Start one in Idea Workshop. A private idea counts, and you can invite people onto it later."
                  actions={
                    <Button
                      label="Go to Idea Workshop"
                      href="/ideas"
                      variant="primary"
                    />
                  }
                />
              ) : (
                <List edge="flush" hasDividers>
                  {ideas.map((idea) => {
                    const role = idea.members.find(
                      (member) => member.clerkUserId === userId,
                    )?.role;
                    const detail = [
                      role ? IDEA_ROLE_LABELS[role] : null,
                      IDEA_TYPE_LABELS[idea.type],
                      idea.isPublic ? "Public" : "Private",
                      idea.isFeatured ? "Featured" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <ListItem
                        key={idea.id}
                        href={ideaPath(idea.slug)}
                        label={idea.name}
                        description={detail}
                      />
                    );
                  })}
                </List>
              )}
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Mentorship</Heading>
              {mentor ? (
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
                        <VStack gap={1}>
                          <Heading level={3}>
                            <Link href={mentorPath(mentor.id)}>
                              {mentor.displayName}
                            </Link>
                          </Heading>
                          {location ? (
                            <Text type="supporting">{location}</Text>
                          ) : null}
                        </VStack>
                      </StackItem>
                    </HStack>
                    {mentor.languageCodes.length > 0 ? (
                      <Text type="supporting">
                        Speaks{" "}
                        {mentor.languageCodes.map(languageName).join(", ")}
                      </Text>
                    ) : null}
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
                          <Text type="supporting">
                            +{hiddenSkillCount} more
                          </Text>
                        ) : null}
                      </HStack>
                    ) : null}
                    <HStack gap={2} wrap="wrap">
                      <Button
                        label="View mentor profile"
                        href={mentorPath(mentor.id)}
                        variant="primary"
                      />
                      <Button label="Edit" href="/mentorship/become" />
                    </HStack>
                  </VStack>
                </Card>
              ) : (
                <Card>
                  <VStack gap={3}>
                    <Text>
                      You are not in the mentor directory.
                    </Text>
                    <Text type="supporting">
                      Mentorship on WeStride is free. List your skills, where
                      you are, and the languages you speak.
                    </Text>
                    <HStack gap={2} wrap="wrap">
                      <Button
                        label="Become a Mentor"
                        href="/mentorship/become"
                        variant="primary"
                      />
                      <Button
                        label="Find a Mentor"
                        href="/mentorship/mentors"
                      />
                    </HStack>
                  </VStack>
                </Card>
              )}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
