import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Markdown } from "@astryxdesign/core/Markdown";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { listAgentsForIdea } from "@westride/db/agents";
import { listProjectsForIdea } from "@westride/db/build";
import { getIdea } from "@westride/db/ideas";
import { PROJECT_STATUS_LABELS, projectPath } from "@/lib/build/labels";
import { claimCardProps } from "@/lib/claims/view";
import { IDEA_ROLE_LABELS, ideaPath, ideasPath } from "@/lib/ideas/filters";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { getMetaConnectionSummary } from "@/lib/meta/connection";
import { LinkedAgents } from "../../agents/linked-agents";
import { EntityImage } from "../../entity-image";
import { EntityImageMenu } from "../../entity-image-menu";
import { ClaimIdeaCard } from "../claim-idea-card";
import { FeaturedBadge, IdeaTypeBadge, LookingForBadges, UnclaimedBadge } from "../idea-badges";
import { BuildProjectButton } from "./build-project-button";
import { EditIdeaButton } from "./edit-idea-button";
import { IdeaFactoryButton } from "./factory/idea-factory-button";
import { SupportSection } from "./support/support-section";

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

  const isMember =
    userId !== null &&
    idea.members.some((member) => member.clerkUserId === userId);
  const isFounder =
    userId !== null &&
    idea.members.some(
      (member) => member.clerkUserId === userId && member.role === "FOUNDER",
    );
  const [profiles, projects, agents, account, claim, metaConnection] = await Promise.all([
    resolveMemberProfiles(idea.members.map((member) => member.clerkUserId)),
    listProjectsForIdea(idea.id, { clerkUserId: userId }),
    listAgentsForIdea(idea.id, { clerkUserId: userId }),
    isMember ? currentUser() : Promise.resolve(null),
    claimCardProps(idea, userId, { returnTo: ideaPath(idea.id), surface: "idea" }),
    isFounder && userId ? getMetaConnectionSummary(userId) : Promise.resolve(null),
  ]);
  const creator = account
    ? {
        name: account.fullName || account.username || "You",
        imageUrl: account.hasImage ? account.imageUrl : null,
      }
    : null;
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
            <HStack gap={4} vAlign="center">
              <EntityImage name={idea.name} imageUrl={idea.imageUrl} size={72} />
              <StackItem size="fill">
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <IdeaTypeBadge type={idea.type} />
                    {idea.isFeatured ? <FeaturedBadge /> : null}
                    {claim ? <UnclaimedBadge /> : null}
                    {!idea.isPublic ? (
                      <Text type="supporting">
                        Private · visible to members only
                      </Text>
                    ) : null}
                    <LookingForBadges idea={idea} />
                  </HStack>
                  <Heading level={1}>{idea.name}</Heading>
                </VStack>
              </StackItem>
            </HStack>
            {isMember && userId ? (
              <HStack gap={3} vAlign="center" wrap="wrap">
                <IdeaFactoryButton
                  idea={{ id: idea.id, name: idea.name, type: idea.type }}
                  viewerId={userId}
                />
                {creator ? (
                  <BuildProjectButton ideaId={idea.id} creator={creator} />
                ) : null}
                {isFounder ? (
                  <>
                    <EditIdeaButton idea={editableIdea} viewerId={userId} />
                    <EntityImageMenu
                      kind="idea"
                      id={idea.id}
                      name={idea.name}
                      imageUrl={idea.imageUrl}
                      hasMetaConnection={metaConnection !== null}
                    />
                  </>
                ) : null}
                <Text type="supporting">
                  Work through this idea with your AI advisory team, then build
                  it.
                </Text>
              </HStack>
            ) : null}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {claim ? <ClaimIdeaCard {...claim} /> : null}

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

            {projects.length > 0 ? (
              <VStack gap={3}>
                <Heading level={2}>Build Studio</Heading>
                <VStack gap={2}>
                  {projects.map((project) => (
                    <HStack key={project.id} gap={2} vAlign="center" wrap="wrap">
                      <Link href={projectPath(project.id)} isStandalone>
                        {project.name}
                      </Link>
                      <Text type="supporting">
                        {PROJECT_STATUS_LABELS[project.status]}
                        {" · "}
                        {project.ticketCounts.DONE} of{" "}
                        {Object.values(project.ticketCounts).reduce((a, b) => a + b, 0)}{" "}
                        tickets done
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            ) : null}

            <LinkedAgents agents={agents} />

            <SupportSection idea={idea} viewerId={userId} isFounder={isFounder} />

            {idea.githubRepo ? (
              <VStack gap={3}>
                <Heading level={2}>Code</Heading>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Link href={idea.githubRepo.htmlUrl} isExternalLink isStandalone>
                    {`${idea.githubRepo.owner}/${idea.githubRepo.name}`}
                  </Link>
                  {idea.githubRepo.isPrivate ? (
                    <Text type="supporting">
                      Private on GitHub · only people with access can open it
                    </Text>
                  ) : null}
                </HStack>
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
            ) : idea.origin === "IMPORT" ? (
              <>
                <Divider />
                <VStack gap={3}>
                  <Heading level={2}>Team</Heading>
                  <Text type="supporting">
                    No team yet. Whoever claims this idea becomes its founder.
                  </Text>
                </VStack>
              </>
            ) : null}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
