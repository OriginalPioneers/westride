import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { listTickets } from "@westride/db/build";
import { listAgentRunsForProject } from "@westride/db/build-agents";
import { ticketKey } from "@westride/db/build-rules";
import { isAgentRunnerConfigured } from "@/lib/build/agent/config";
import { reconcileStaleRun } from "@/lib/build/agent/finish";
import { ticketPath } from "@/lib/build/labels";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { loadProjectPage } from "../load-project";
import { ProjectHeader } from "../project-header";
import { RunStatusBadge } from "../tickets/[number]/run-log";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadProjectPage((await params).id);
  return { title: context ? `Agent runs · ${context.project.name}` : "Agent runs" };
}

export default async function RunsPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadProjectPage(id);
  if (!context) {
    notFound();
  }
  const { project } = context;
  const [storedRuns, tickets] = await Promise.all([
    listAgentRunsForProject(project.id, 100),
    listTickets(project.id),
  ]);
  const runs = await Promise.all(storedRuns.map((run) => reconcileStaleRun(run)));
  const profiles = await resolveMemberProfiles([
    ...new Set(runs.map((run) => run.startedByClerkUserId)),
  ]);
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  return (
    <Layout
      contentWidth={1100}
      header={
        <LayoutHeader hasDivider>
          <ProjectHeader context={context} section="runs" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            {!isAgentRunnerConfigured() ? (
              <Banner
                status="info"
                title="Agents are not set up on this server"
                description="Muse Code runs need Vercel Sandbox credentials and a public callback URL. See docs/build-studio.md."
              />
            ) : null}
            {runs.length === 0 ? (
              <EmptyState
                title="No agent runs yet"
                description="Open a ticket and choose Run with Muse Code. Every run, its work log, and its pull request show up here."
              />
            ) : (
              <List>
                {runs.map((run) => {
                  const ticket = ticketsById.get(run.ticketId);
                  const key = ticket ? ticketKey(project.name, ticket.number) : "Deleted ticket";
                  const starter = profiles.get(run.startedByClerkUserId)?.name ?? "WeStride member";
                  return (
                    <ListItem
                      key={run.id}
                      href={ticket ? ticketPath(project.id, ticket.number) : undefined}
                      label={ticket ? `${key} · ${ticket.title}` : key}
                      description={
                        <VStack gap={0}>
                          <Text type="supporting">
                            {run.repoFullName} · {run.branch} · {run.model} · started by {starter}{" "}
                            <Timestamp value={run.createdAt.toISOString()} format="relative" />
                          </Text>
                          {run.error ? (
                            <Text type="supporting" maxLines={2}>
                              {run.error}
                            </Text>
                          ) : null}
                        </VStack>
                      }
                      endContent={
                        <HStack gap={2} vAlign="center">
                          {run.prUrl ? (
                            <Link href={run.prUrl} isExternalLink>
                              {`PR #${run.prNumber}`}
                            </Link>
                          ) : null}
                          <RunStatusBadge status={run.status} />
                        </HStack>
                      }
                    />
                  );
                })}
              </List>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
