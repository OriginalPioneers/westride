import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { TICKET_STATUSES, listTickets } from "@westride/db/build";
import { isRunActive, listAgentRunsForProject } from "@westride/db/build-agents";
import { ticketKey } from "@westride/db/build-rules";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { loadProjectPage } from "../load-project";
import { PlanWithMuseButton } from "../plan-button";
import { ProjectHeader } from "../project-header";
import { NewTicketButton } from "../tickets/new-ticket-button";
import { Board, type BoardTicket } from "./board";

type Params = Promise<{ id: string }>;

/** Muse planning actions called from this page can take a few minutes. */
export const maxDuration = 300;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const context = await loadProjectPage((await params).id);
  return { title: context ? `Board · ${context.project.name}` : "Board" };
}

export default async function BoardPage({ params }: { params: Params }) {
  const { id } = await params;
  const context = await loadProjectPage(id);
  if (!context) {
    notFound();
  }
  const { project } = context;
  const [tickets, runs, profiles] = await Promise.all([
    listTickets(project.id),
    listAgentRunsForProject(project.id, 100),
    resolveMemberProfiles(project.members.map((member) => member.clerkUserId)),
  ]);
  const activeTicketIds = new Set(
    runs.filter((run) => isRunActive(run.status)).map((run) => run.ticketId),
  );
  const members = project.members.map((member) => ({
    clerkUserId: member.clerkUserId,
    name: profiles.get(member.clerkUserId)?.name ?? "WeStride member",
  }));
  const boardTickets: BoardTicket[] = tickets.map((ticket) => ({
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    source: ticket.source,
    blockedReason: ticket.blockedReason,
    key: ticketKey(project.name, ticket.number),
    assigneeName: ticket.assigneeClerkUserId
      ? (profiles.get(ticket.assigneeClerkUserId)?.name ?? "WeStride member")
      : null,
    milestoneTitle: ticket.milestone?.title ?? null,
    hasActiveRun: activeTicketIds.has(ticket.id),
  }));

  return (
    <Layout
      contentWidth={1400}
      header={
        <LayoutHeader hasDivider>
          <ProjectHeader
            context={context}
            section="board"
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
                    members={members}
                  />
                </>
              ) : null
            }
          />
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {tickets.length === 0 ? (
            <EmptyState
              title="The board is empty"
              description="Add tickets by hand or ask Muse to draft a backlog, then move them across the board as work happens."
            />
          ) : (
            <Board
              projectId={project.id}
              statuses={[...TICKET_STATUSES]}
              tickets={boardTickets}
              canEdit={context.isMember}
            />
          )}
        </LayoutContent>
      }
    />
  );
}
