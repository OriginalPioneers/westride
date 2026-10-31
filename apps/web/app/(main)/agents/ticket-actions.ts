"use server";

import type { AgentTicket } from "@westride/db";
import {
  addAgentLog,
  createAgentTicket,
  deleteAgentTicket,
  getActiveJobForTicket,
  getAgentTicketById,
  moveAgentTicket,
  updateAgentTicket,
} from "@westride/db/agents";
import { failure, isFailure, requireAgentCollaborator, revalidateAgent, type Failure } from "@/lib/agents/access";
import { TICKET_STATUS_LABELS } from "@/lib/agents/labels";
import { agentTicketSchema, fieldErrorsFrom, moveAgentTicketSchema, uuidSchema } from "@/lib/agents/schema";

type Ok = { status: "ok" };

async function ownTicket(agentId: string, ticketId: string): Promise<AgentTicket | Failure> {
  if (!uuidSchema.safeParse(ticketId).success) {
    return failure("That ticket does not exist.");
  }
  const ticket = await getAgentTicketById(ticketId);
  if (!ticket || ticket.agentId !== agentId) {
    return failure("That ticket does not exist.");
  }
  return ticket;
}

export async function createAgentTicketAction(
  agentId: string,
  input: unknown,
): Promise<{ status: "ok"; ticket: AgentTicket } | Failure> {
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  const parsed = agentTicketSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  try {
    const ticket = await createAgentTicket(agentId, {
      ...parsed.data,
      createdByClerkUserId: context.userId,
    });
    await addAgentLog(agentId, {
      kind: "ticket",
      message: `Queued ticket #${ticket.number}: ${ticket.title}.`,
      ticketId: ticket.id,
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok", ticket };
  } catch (error) {
    console.error("Agent ticket create failed", error);
    return failure("The ticket could not be created. Try again.");
  }
}

export async function updateAgentTicketAction(
  agentId: string,
  ticketId: string,
  input: unknown,
): Promise<{ status: "ok"; ticket: AgentTicket } | Failure> {
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  const existing = await ownTicket(agentId, ticketId);
  if (isFailure(existing)) {
    return existing;
  }
  const parsed = agentTicketSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  try {
    const ticket = await updateAgentTicket(agentId, ticketId, parsed.data);
    if (!ticket) {
      return failure("That ticket does not exist.");
    }
    await addAgentLog(agentId, {
      kind: "ticket",
      message: `Edited ticket #${ticket.number}: ${ticket.title}.`,
      ticketId: ticket.id,
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok", ticket };
  } catch (error) {
    console.error("Agent ticket update failed", error);
    return failure("The ticket could not be saved. Try again.");
  }
}

export async function moveAgentTicketAction(
  agentId: string,
  ticketId: string,
  input: unknown,
): Promise<Ok | Failure> {
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  const existing = await ownTicket(agentId, ticketId);
  if (isFailure(existing)) {
    return existing;
  }
  const parsed = moveAgentTicketSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the status change.", fieldErrorsFrom(parsed.error));
  }
  if (parsed.data.status !== "IN_PROGRESS" && (await getActiveJobForTicket(ticketId))) {
    return failure("Stop the running job before moving this ticket.");
  }
  try {
    const ticket = await moveAgentTicket(
      agentId,
      ticketId,
      parsed.data.status,
      parsed.data.status === "BLOCKED" ? parsed.data.blockedReason : null,
    );
    if (!ticket) {
      return failure("That ticket does not exist.");
    }
    await addAgentLog(agentId, {
      kind: "ticket",
      message: `Moved ticket #${ticket.number} to ${TICKET_STATUS_LABELS[ticket.status]}.`,
      ticketId: ticket.id,
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent ticket move failed", error);
    return failure("The ticket could not be moved. Try again.");
  }
}

export async function deleteAgentTicketAction(agentId: string, ticketId: string): Promise<Ok | Failure> {
  const context = await requireAgentCollaborator(agentId);
  if (isFailure(context)) {
    return context;
  }
  const existing = await ownTicket(agentId, ticketId);
  if (isFailure(existing)) {
    return existing;
  }
  if (await getActiveJobForTicket(ticketId)) {
    return failure("Stop the running job before deleting this ticket.");
  }
  try {
    await deleteAgentTicket(agentId, ticketId);
    await addAgentLog(agentId, {
      kind: "ticket",
      message: `Deleted ticket #${existing.number}: ${existing.title}.`,
      actorClerkUserId: context.userId,
    });
    revalidateAgent(agentId);
    return { status: "ok" };
  } catch (error) {
    console.error("Agent ticket delete failed", error);
    return failure("The ticket could not be deleted. Try again.");
  }
}
