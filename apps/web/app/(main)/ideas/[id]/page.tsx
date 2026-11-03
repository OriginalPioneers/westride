import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { listAgentsForIdea } from "@westride/db/agents";
import { listProjectsForIdea } from "@westride/db/build";
import { getIdea, listCategoryOptions } from "@westride/db/ideas";
import { PROJECT_STATUS_LABELS, projectPath } from "@/lib/build/labels";
import { claimCardProps } from "@/lib/claims/view";
import { IDEA_ROLE_LABELS, ideaPath, ideasPath } from "@/lib/ideas/filters";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { getMetaConnectionSummary } from "@/lib/meta/connection";
import { AgentStudioLink, LinkedAgentList } from "../../agents/linked-agents";
import { EntityImage } from "../../entity-image";
import { EntityImageMenu } from "../../entity-image-menu";
import { ClaimIdeaCard } from "../claim-idea-card";
import { FollowButton } from "../follow-button";
import { FeaturedBadge, IdeaTypeBadge, LookingForBadges, UnclaimedBadge } from "../idea-badges";
import { BuildProjectButton } from "./build-project-button";
import { EditIdeaButton } from "./edit-idea-button";
import { IdeaFactoryButton } from "./factory/idea-factory-button";
import { IdeaDocument, type IdeaDocumentSection } from "./idea-document";
import { showsSupportSection, SupportSection, SupportSettings } from "./support/support-section";

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

export default async function IdeaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ factory?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [idea, { userId }] = await Promise.all([loadIdea(id), auth()]);
  // `?factory=open` is set right after creating an idea so the workshop opens itself.
  const openFactory = query.factory === "open";
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
  const [profiles, projects, agents, account, claim, metaConnection, categoryOptions] =
    await Promise.all([
      resolveMemberProfiles(idea.members.map((member) => member.clerkUserId)),
      listProjectsForIdea(idea.id, { clerkUserId: userId }),
      listAgentsForIdea(idea.id, { clerkUserId: userId }),
      isMember ? currentUser() : Promise.resolve(null),
      claimCardProps(idea, userId, { returnTo: ideaPath(idea.id), surface: "idea" }),
      isFounder && userId ? getMetaConnectionSummary(userId) : Promise.resolve(null),
      isFounder ? listCategoryOptions() : Promise.resolve([]),
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
    categories: idea.tags.map((category) => category.name),
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

  const labels = (
    <VStack gap={4}>
      <Link href="/ideas" isStandalone>
        Idea Workshop
      </Link>
      <HStack gap={4} vAlign="center">
        <EntityImage name={idea.name} imageUrl={idea.imageUrl} size={72} />
        <StackItem size="fill">
          <HStack gap={2} vAlign="center" wrap="wrap">
            <IdeaTypeBadge type={idea.type} />
            {idea.isFeatured ? <FeaturedBadge /> : null}
            {claim ? <UnclaimedBadge /> : null}
            {!idea.isPublic ? (
              <Text type="supporting">Private · visible to members only</Text>
            ) : null}
            <LookingForBadges idea={idea} />
          </HStack>
        </StackItem>
      </HStack>
    </VStack>
  );

  const lede = isMember
    ? "Work through this idea with your AI advisory team, then build it."
    : idea.followerCount === 1
      ? "1 person follows this idea."
      : `${idea.followerCount} people follow this idea.`;

  const actions =
    isMember && userId ? (
      <>
        <IdeaFactoryButton
          idea={{ id: idea.id, name: idea.name, type: idea.type }}
          viewerId={userId}
          autoOpen={openFactory}
        />
        {creator ? (
          <BuildProjectButton ideaId={idea.id} creator={creator} />
        ) : null}
        {isFounder ? (
          <>
            <EditIdeaButton
              idea={editableIdea}
              viewerId={userId}
              categoryOptions={categoryOptions}
            />
            <EntityImageMenu
              kind="idea"
              id={idea.id}
              name={idea.name}
              imageUrl={idea.imageUrl}
              hasMetaConnection={metaConnection !== null}
            />
          </>
        ) : null}
      </>
    ) : (
      <FollowButton
        ideaId={idea.id}
        isFollowing={idea.isFollowing}
        viewerId={userId}
      />
    );

  const hero =
    claim || idea.prototypeUrl ? (
      <VStack gap={4}>
        {claim ? <ClaimIdeaCard {...claim} /> : null}
        {idea.prototypeUrl ? (
          <Card variant="muted" padding={0}>
            <Center minHeight={240} padding={8}>
              <VStack gap={3} hAlign="center" maxWidth={560}>
                <Heading level={2}>Try the prototype</Heading>
                {idea.prototypeInstructions ? (
                  <Text>{idea.prototypeInstructions}</Text>
                ) : null}
                <Button
                  label="Open prototype"
                  variant="primary"
                  href={idea.prototypeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  endContent={<Icon icon={ArrowTopRightOnSquareIcon} />}
                />
              </VStack>
            </Center>
          </Card>
        ) : null}
      </VStack>
    ) : undefined;

  const sections: IdeaDocumentSection[] = [
    {
      id: "overview",
      title: "Overview",
      content: (
        <Markdown headingLevelStart={3} contentWidth="100%">
          {idea.description}
        </Markdown>
      ),
    },
  ];

  if (projects.length > 0) {
    sections.push({
      id: "build-studio",
      title: "Build Studio",
      content: (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Project</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Tickets done</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link href={projectPath(project.id)}>{project.name}</Link>
                </TableCell>
                <TableCell>{PROJECT_STATUS_LABELS[project.status]}</TableCell>
                <TableCell>
                  {project.ticketCounts.DONE} of{" "}
                  {Object.values(project.ticketCounts).reduce((a, b) => a + b, 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ),
    });
  }

  if (agents.length > 0) {
    sections.push({
      id: "agents",
      title: "Agents",
      actions: <AgentStudioLink />,
      content: <LinkedAgentList agents={agents} />,
    });
  }

  if (showsSupportSection(idea, isFounder)) {
    sections.push({
      id: "support",
      title: "Support this idea",
      actions: isFounder ? <SupportSettings idea={idea} /> : undefined,
      content: <SupportSection idea={idea} viewerId={userId} isFounder={isFounder} />,
    });
  }

  if (idea.githubRepo || idea.tags.length > 0 || idea.countries.length > 0) {
    sections.push({
      id: "details",
      title: "Details",
      content: (
        <MetadataList>
          {idea.githubRepo ? (
            <MetadataListItem label="Code">
              <VStack gap={1}>
                <Link href={idea.githubRepo.htmlUrl} isExternalLink>
                  {`${idea.githubRepo.owner}/${idea.githubRepo.name}`}
                </Link>
                {idea.githubRepo.isPrivate ? (
                  <Text type="supporting">
                    Private on GitHub · only people with access can open it
                  </Text>
                ) : null}
              </VStack>
            </MetadataListItem>
          ) : null}
          {idea.tags.length > 0 ? (
            <MetadataListItem label="Categories">
              <HStack gap={2} wrap="wrap">
                {idea.tags.map((category) => (
                  <Token
                    key={category.id}
                    label={category.name}
                    href={ideasPath({ category: category.slug })}
                  />
                ))}
              </HStack>
            </MetadataListItem>
          ) : null}
          {idea.countries.length > 0 ? (
            <MetadataListItem label="Geographies">
              <HStack gap={2} wrap="wrap">
                {idea.countries.map((country) => (
                  <Token
                    key={country.code}
                    label={country.name}
                    href={ideasPath({ country: country.code })}
                  />
                ))}
              </HStack>
            </MetadataListItem>
          ) : null}
        </MetadataList>
      ),
    });
  }

  if (idea.members.length > 0) {
    sections.push({
      id: "team",
      title: "Team",
      content: (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Member</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {idea.members.map((member) => {
              const profile = profiles.get(member.clerkUserId);
              const name = profile?.name ?? "WeStride member";
              return (
                <TableRow key={member.clerkUserId}>
                  <TableCell>
                    <HStack gap={3} vAlign="center">
                      <Avatar
                        src={profile?.imageUrl ?? undefined}
                        name={name}
                        size="sm"
                        tooltip={false}
                      />
                      <Text>{name}</Text>
                    </HStack>
                  </TableCell>
                  <TableCell>{IDEA_ROLE_LABELS[member.role]}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ),
    });
  } else if (idea.origin === "IMPORT") {
    sections.push({
      id: "team",
      title: "Team",
      content: (
        <Text type="supporting">
          No team yet. Whoever claims this idea becomes its founder.
        </Text>
      ),
    });
  }

  return (
    <IdeaDocument
      tabs={labels}
      title={idea.name}
      lede={lede}
      actions={actions}
      hero={hero}
      sections={sections}
    />
  );
}
