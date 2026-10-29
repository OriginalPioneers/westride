import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Markdown } from "@astryxdesign/core/Markdown";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { getIdea } from "@westride/db/ideas";
import { IDEA_ROLE_LABELS, ideasPath } from "@/lib/ideas/filters";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { FeaturedBadge, IdeaTypeBadge } from "../idea-badges";
import { EditIdeaButton } from "./edit-idea-button";
import { IdeaFactoryButton } from "./factory/idea-factory-button";

type Params = Promise<{ id: string }>;

// Idea Factory server actions wait on Meta's Responses API (web search +
// reasoning can take a couple of minutes per advisor).
export const maxDuration = 180;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadIdea(id: string) {
  if (!UUID.test(id)) {
    return null;
  }
  const { userId } = await auth();
  return getIdea(id, { clerkUserId: userId });
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const idea = await loadIdea((await params).id);
  return { title: idea?.name ?? "Idea" };
}

export default async function IdeaPage({ params }: { params: Params }) {
  const { id } = await params;
  const [idea, { userId }] = await Promise.all([loadIdea(id), auth()]);
  if (!idea) {
    notFound();
  }

  const profiles = await resolveMemberProfiles(
    idea.members.map((member) => member.clerkUserId),
  );
  const isMember =
    userId !== null &&
    idea.members.some((member) => member.clerkUserId === userId);
  const isFounder =
    userId !== null &&
    idea.members.some(
      (member) => member.clerkUserId === userId && member.role === "FOUNDER",
    );
  const editableIdea = {
    id: idea.id,
    prototypeUrl: idea.prototypeUrl,
    prototypeInstructions: idea.prototypeInstructions,
    isPublic: idea.isPublic,
    name: idea.name,
    description: idea.description,
    members: idea.members.map((member) => {
      const profile = profiles.get(member.clerkUserId);
      return {
        clerkUserId: member.clerkUserId,
        role: member.role,
        name: profile?.name ?? "WeStride member",
        imageUrl: profile?.imageUrl ?? null,
      };
    }),
  };

  return (
    <Layout
      contentWidth={800}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <Link href="/ideas" isStandalone>
              All ideas
            </Link>
            <VStack gap={2}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <IdeaTypeBadge type={idea.type} />
                {idea.isFeatured ? <FeaturedBadge /> : null}
                {!idea.isPublic ? (
                  <Text type="supporting">
                    Private · visible to members only
                  </Text>
                ) : null}
              </HStack>
              <Heading level={1}>{idea.name}</Heading>
            </VStack>
            {isMember && userId ? (
              <HStack gap={3} vAlign="center" wrap="wrap">
                <IdeaFactoryButton
                  idea={{ id: idea.id, name: idea.name, type: idea.type }}
                  viewerId={userId}
                />
                {isFounder ? (
                  <EditIdeaButton idea={editableIdea} viewerId={userId} />
                ) : null}
                <Text type="supporting">
                  Work through this idea with your AI advisory team.
                </Text>
              </HStack>
            ) : null}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            <Markdown headingLevelStart={2} contentWidth="100%">
              {idea.description}
            </Markdown>

            {idea.prototypeUrl ? (
              <VStack gap={3}>
                <Heading level={2}>Try the prototype</Heading>
                <Text>{idea.prototypeInstructions}</Text>
                <Link href={idea.prototypeUrl} isExternalLink isStandalone>
                  Open prototype
                </Link>
              </VStack>
            ) : null}

            {idea.tags.length > 0 ? (
              <VStack gap={3}>
                <Heading level={2}>Tags</Heading>
                <HStack gap={2} wrap="wrap">
                  {idea.tags.map((tag) => (
                    <Token
                      key={tag.id}
                      label={tag.name}
                      href={ideasPath({ tag: tag.slug })}
                    />
                  ))}
                </HStack>
              </VStack>
            ) : null}

            {idea.countries.length > 0 ? (
              <VStack gap={3}>
                <Heading level={2}>Geographies</Heading>
                <HStack gap={2} wrap="wrap">
                  {idea.countries.map((country) => (
                    <Token
                      key={country.code}
                      label={country.name}
                      href={ideasPath({ country: country.code })}
                    />
                  ))}
                </HStack>
              </VStack>
            ) : null}

            {idea.members.length > 0 ? (
              <>
                <Divider />
                <VStack gap={3}>
                  <Heading level={2}>Team</Heading>
                  <VStack gap={3}>
                    {idea.members.map((member) => {
                      const profile = profiles.get(member.clerkUserId);
                      const name = profile?.name ?? "WeStride member";
                      return (
                        <HStack
                          key={member.clerkUserId}
                          gap={3}
                          vAlign="center"
                        >
                          <Avatar
                            src={profile?.imageUrl ?? undefined}
                            name={name}
                            size="md"
                            tooltip={false}
                          />
                          <StackItem size="fill">
                            <VStack gap={0}>
                              <Text>{name}</Text>
                              <Text type="supporting">
                                {IDEA_ROLE_LABELS[member.role]}
                              </Text>
                            </VStack>
                          </StackItem>
                        </HStack>
                      );
                    })}
                  </VStack>
                </VStack>
              </>
            ) : null}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
