import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  TICKET_STATUSES,
  ticketProgressPercent,
  totalTickets,
} from "@westride/db/build";
import { listAgentsForProject } from "@westride/db/agents";
import { getIdea } from "@westride/db/ideas";
import {
  MILESTONE_STATUS_LABELS,
  PROJECT_ROLE_LABELS,
  TICKET_STATUS_LABELS,
  activityPath,
  projectPath,
  projectSettingsPath,
  ticketsPath,
} from "@/lib/build/labels";
import { claimCardProps } from "@/lib/claims/view";
import { ideaPath } from "@/lib/ideas/filters";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { LinkedAgents } from "../../agents/linked-agents";
import { EntityImageMenu } from "../../entity-image-menu";
import { ClaimIdeaCard } from "../../ideas/claim-idea-card";
import { loadProjectPage } from "./load-project";
import { PlanWithMuseButton } from "./plan-button";
import { ProjectHeader } from "./project-header";
import { NewTicketButton } from "./tickets/new-ticket-button";

type Params = Promise<{ id: string }>;

/** Muse planning and image actions called from this page can take a few minutes. */
export const maxDuration = 300;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadProjectPage((await params).id);
  return { title: context?.project.name ?? "Project" };
}

export default async function ProjectOverviewPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadProjectPage(id);
  if (!context) {
    notFound();
  }
  const { project, userId } = context;
  const [profiles, idea, agents] = await Promise.all([
    resolveMemberProfiles(project.members.map((member) => member.clerkUserId)),
    project.ideaId ? getIdea(project.ideaId, { clerkUserId: userId }) : Promise.resolve(null),
    listAgentsForProject(project.id, { clerkUserId: userId }),
  ]);
  const total = totalTickets(project.ticketCounts);
  const percent = ticketProgressPercent(project.ticketCounts);
  const claim =
    context.isClaimable && idea
      ? await claimCardProps(idea, userId, {
          returnTo: projectPath(project.id),
          surface: "project",
        })
      : null;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <ProjectHeader
            context={context}
            section="overview"
            actions={
              context.isMember ? (
                <>
                  <PlanWithMuseButton
                    projectId={project.id}
                    hasMetaConnection={context.hasMetaConnection}
                    openTicketCount={context.openTicketCount}
                  />
                  <NewTicketButton
                    projectId={project.id}
                    milestones={project.milestones}
                    repos={project.repos}
                    members={project.members.map((member) => ({
                      clerkUserId: member.clerkUserId,
                      name: profiles.get(member.clerkUserId)?.name ?? "WeStride member",
                    }))}
                  />
                  {context.isOwner ? (
                    <EntityImageMenu
                      kind="project"
                      id={project.id}
                      name={project.name}
                      imageUrl={project.imageUrl}
                      hasMetaConnection={context.hasMetaConnection}
                    />
                  ) : null}
                  <Button
                    label="Settings"
                    variant="secondary"
                    href={projectSettingsPath(project.id)}
                  />
                </>
              ) : null
            }
          />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {claim ? <ClaimIdeaCard {...claim} /> : null}

            <Markdown headingLevelStart={2} contentWidth="100%">
              {project.description}
            </Markdown>

            {idea ? (
              <Text type="supporting">
                Building the idea{" "}
                <Link href={ideaPath(idea.slug)}>{idea.name}</Link>.
              </Text>
            ) : null}

            <Divider />

            <VStack gap={3}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Progress</Heading>
                </StackItem>
                <Link href={ticketsPath(project.id)} isStandalone>
                  All tickets
                </Link>
              </HStack>
              {total === 0 ? (
                <Text type="supporting">
                  No tickets yet. Add the first one, or ask Muse to draft a backlog
                  from the description above.
                </Text>
              ) : (
                <VStack gap={3}>
                  <ProgressBar
                    label={`${project.ticketCounts.DONE} of ${total} tickets done`}
                    value={percent}
                    hasValueLabel
                    variant={percent === 100 ? "success" : "accent"}
                  />
                  <List density="compact">
                    {TICKET_STATUSES.map((status) => (
                      <ListItem
                        key={status}
                        href={ticketsPath(project.id, status)}
                        label={TICKET_STATUS_LABELS[status]}
                        endContent={
                          <Text type="supporting" hasTabularNumbers>
                            {project.ticketCounts[status]}
                          </Text>
                        }
                      />
                    ))}
                  </List>
                </VStack>
              )}
            </VStack>

            {project.milestones.length > 0 ? (
              <VStack gap={3}>
                <Heading level={2}>Roadmap</Heading>
                <List>
                  {project.milestones.map((milestone) => (
                    <ListItem
                      key={milestone.id}
                      label={milestone.title}
                      description={
                        <Text type="supporting" maxLines={2}>
                          {[
                            MILESTONE_STATUS_LABELS[milestone.status],
                            milestone.targetDate ? `target ${milestone.targetDate}` : null,
                            milestone.description || null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      }
                    />
                  ))}
                </List>
              </VStack>
            ) : null}

            <VStack gap={3}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={2}>Code</Heading>
                </StackItem>
                {project.repos.length > 0 ? (
                  <Link href={activityPath(project.id)} isStandalone>
                    Commits, pull requests, and deployments
                  </Link>
                ) : null}
              </HStack>
              {project.repos.length === 0 ? (
                <Text type="supporting">
                  No repositories linked yet.
                  {context.isMember ? (
                    <>
                      {" "}
                      <Link href={projectSettingsPath(project.id)}>Link one</Link> so
                      Muse Code agents have somewhere to work.
                    </>
                  ) : null}
                </Text>
              ) : (
                <List>
                  {project.repos.map((repo) => (
                    <ListItem
                      key={repo.id}
                      href={repo.htmlUrl}
                      target="_blank"
                      label={`${repo.owner}/${repo.name}`}
                      description={[
                        repo.isPrimary ? "Primary" : null,
                        repo.isPrivate ? "Private on GitHub" : "Public",
                        `default branch ${repo.defaultBranch}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ))}
                </List>
              )}
            </VStack>

            <LinkedAgents agents={agents} />

            <Divider />

            <VStack gap={3}>
              <Heading level={2}>Team</Heading>
              {project.members.length === 0 ? (
                <Text type="supporting">
                  {context.isClaimable
                    ? "No team yet. Whoever claims this project becomes its owner."
                    : "No team."}
                </Text>
              ) : null}
              <VStack gap={3}>
                {project.members.map((member) => {
                  const profile = profiles.get(member.clerkUserId);
                  const name = profile?.name ?? "WeStride member";
                  return (
                    <HStack key={member.clerkUserId} gap={3} vAlign="center">
                      <Avatar
                        src={profile?.imageUrl ?? undefined}
                        name={name}
                        size="md"
                        tooltip={false}
                      />
                      <StackItem size="fill">
                        <VStack gap={0}>
                          <Text>{name}</Text>
                          <Text type="supporting">{PROJECT_ROLE_LABELS[member.role]}</Text>
                        </VStack>
                      </StackItem>
                    </HStack>
                  );
                })}
              </VStack>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
