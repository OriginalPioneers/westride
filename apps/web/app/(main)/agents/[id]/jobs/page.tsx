import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { agentTicketKey, listAgentJobs, listAgentTickets } from "@westride/db/agents";
import { reconcileStaleJob } from "@/lib/agents/finish";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { AgentHeader } from "../agent-header";
import { JobRow } from "../job-row";
import { loadAgentPage } from "../load-agent";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadAgentPage((await params).id);
  return { title: context ? `Jobs · ${context.agent.name}` : "Jobs" };
}

export default async function AgentJobsPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadAgentPage(id);
  if (!context) {
    notFound();
  }
  const { agent } = context;
  const [storedJobs, tickets] = await Promise.all([listAgentJobs(agent.id, 100), listAgentTickets(agent.id)]);
  const jobs = await Promise.all(storedJobs.map((job) => reconcileStaleJob(job)));
  const profiles = await resolveMemberProfiles(
    jobs.flatMap((job) => (job.startedByClerkUserId ? [job.startedByClerkUserId] : [])),
  );
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  return (
    <Layout
      contentWidth={1100}
      header={
        <LayoutHeader hasDivider>
          <AgentHeader context={context} section="jobs" />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            {agent.repoOwner && !context.runsCode ? (
              <Banner
                status="info"
                title="Code jobs are not set up on this server"
                description="The agent has a repository, but Muse Code sandboxes need Vercel Sandbox credentials and a public callback URL, so jobs run as reports for now. See docs/agent-studio.md."
              />
            ) : null}
            {jobs.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                description="Every run, on request or on schedule, shows up here with its work log, report, tokens, and cost."
              />
            ) : (
              <List>
                {jobs.map((job) => {
                  const ticket = job.ticketId ? ticketsById.get(job.ticketId) : undefined;
                  return (
                    <JobRow
                      key={job.id}
                      job={job}
                      ticketKey={ticket ? agentTicketKey(agent.name, ticket.number) : null}
                      starterName={job.startedByClerkUserId ? (profiles.get(job.startedByClerkUserId)?.name ?? null) : null}
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
