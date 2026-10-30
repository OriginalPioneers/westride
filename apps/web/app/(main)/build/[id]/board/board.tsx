"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import type { TicketStatus } from "@westride/db";
import type { TicketWithDetails } from "@westride/db/build";
import { TICKET_STATUS_HINTS, TICKET_STATUS_LABELS, ticketPath } from "@/lib/build/labels";
import { MAX_BLOCKED_REASON } from "@/lib/build/schema";
import { MuseDraftedBadge, TicketPriorityBadge } from "../../project-badges";
import { reorderTicketAction } from "../../actions";

export type BoardTicket = Pick<
  TicketWithDetails,
  "id" | "number" | "title" | "status" | "priority" | "source" | "blockedReason"
> & {
  key: string;
  assigneeName: string | null;
  milestoneTitle: string | null;
  hasActiveRun: boolean;
};

type PendingMove = { ticket: BoardTicket; status: "BLOCKED"; index: number };

/**
 * Columns per status, with move and reorder controls on each card. Changes
 * are optimistic; the server answer wins when it comes back.
 */
export function Board({
  projectId,
  statuses,
  tickets: initial,
  canEdit,
}: {
  projectId: string;
  statuses: TicketStatus[];
  tickets: BoardTicket[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [reason, setReason] = useState("");
  const [isMoving, startMoving] = useTransition();

  const columns = statuses.map((status) => ({
    status,
    tickets: tickets.filter((ticket) => ticket.status === status),
  }));

  function apply(ticket: BoardTicket, status: TicketStatus, index: number, blockedReason = "") {
    const before = tickets;
    // Optimistic: pull the card out and drop it at the new spot.
    const rest = tickets.filter((candidate) => candidate.id !== ticket.id);
    const column = rest.filter((candidate) => candidate.status === status);
    const anchor = column[Math.min(index, column.length)];
    const moved: BoardTicket = {
      ...ticket,
      status,
      blockedReason: status === "BLOCKED" ? blockedReason : null,
    };
    const next = anchor
      ? rest.flatMap((candidate) => (candidate.id === anchor.id ? [moved, candidate] : [candidate]))
      : [...rest, moved];
    setTickets(next);
    setMessage(null);
    startMoving(async () => {
      const result = await reorderTicketAction(projectId, ticket.id, {
        status,
        index,
        blockedReason,
      });
      if (result.status === "error") {
        setTickets(before);
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  function move(ticket: BoardTicket, status: TicketStatus, index: number) {
    if (status === "BLOCKED") {
      setReason(ticket.blockedReason ?? "");
      setPending({ ticket, status, index });
      return;
    }
    apply(ticket, status, index);
  }

  return (
    <VStack gap={4}>
      {message ? <Banner status="error" title={message} /> : null}
      <Grid columns={{ minWidth: 240, max: statuses.length }} gap={4}>
        {columns.map((column) => (
          <VStack key={column.status} gap={3}>
            <HStack gap={2} vAlign="center">
              <StackItem size="fill">
                <Heading level={2}>{TICKET_STATUS_LABELS[column.status]}</Heading>
              </StackItem>
              <Text type="supporting" hasTabularNumbers>
                {column.tickets.length}
              </Text>
            </HStack>
            <Text type="supporting">{TICKET_STATUS_HINTS[column.status]}</Text>
            {column.tickets.length === 0 ? (
              <Card variant="muted" padding={3}>
                <Text type="supporting">Nothing here.</Text>
              </Card>
            ) : (
              column.tickets.map((ticket, index) => (
                <Card key={ticket.id} padding={3} elevation="low">
                  <VStack gap={2}>
                    <HStack gap={2} vAlign="start">
                      <StackItem size="fill">
                        <VStack gap={1}>
                          <Text type="supporting" hasTabularNumbers>
                            {ticket.key}
                          </Text>
                          <Link href={ticketPath(projectId, ticket.number)}>{ticket.title}</Link>
                        </VStack>
                      </StackItem>
                      {canEdit ? (
                        <MoreMenu
                          label={`Move ${ticket.key}`}
                          size="sm"
                          alignment="end"
                          isDisabled={isMoving}
                          items={[
                            {
                              type: "section",
                              title: "Reorder",
                              items: [
                                {
                                  label: "Move up",
                                  isDisabled: index === 0,
                                  onClick: () => move(ticket, column.status, index - 1),
                                },
                                {
                                  label: "Move down",
                                  isDisabled: index === column.tickets.length - 1,
                                  onClick: () => move(ticket, column.status, index + 1),
                                },
                                {
                                  label: "Move to top",
                                  isDisabled: index === 0,
                                  onClick: () => move(ticket, column.status, 0),
                                },
                              ],
                            },
                            {
                              type: "section",
                              title: "Move to",
                              items: statuses
                                .filter((status) => status !== column.status)
                                .map((status) => ({
                                  label: TICKET_STATUS_LABELS[status],
                                  onClick: () => move(ticket, status, 0),
                                })),
                            },
                          ]}
                        />
                      ) : null}
                    </HStack>
                    <HStack gap={1} vAlign="center" wrap="wrap">
                      <TicketPriorityBadge priority={ticket.priority} />
                      {ticket.source === "MUSE" ? <MuseDraftedBadge /> : null}
                      {ticket.hasActiveRun ? <Text type="supporting">Agent working</Text> : null}
                    </HStack>
                    {ticket.milestoneTitle || ticket.assigneeName ? (
                      <Text type="supporting" maxLines={1}>
                        {[ticket.milestoneTitle, ticket.assigneeName].filter(Boolean).join(" · ")}
                      </Text>
                    ) : null}
                    {ticket.status === "BLOCKED" && ticket.blockedReason ? (
                      <Text type="supporting" maxLines={2}>
                        {ticket.blockedReason}
                      </Text>
                    ) : null}
                  </VStack>
                </Card>
              ))
            )}
          </VStack>
        ))}
      </Grid>

      {pending ? (
        <Dialog isOpen onOpenChange={(open) => (open ? undefined : setPending(null))} purpose="form" width={480}>
          <Layout
            header={
              <DialogHeader
                title={`Roadblock ${pending.ticket.key}`}
                hasDivider
                onOpenChange={(open) => (open ? undefined : setPending(null))}
              />
            }
            content={
              <LayoutContent>
                <TextArea
                  label="What is blocking it?"
                  value={reason}
                  onChange={setReason}
                  rows={3}
                  maxLength={MAX_BLOCKED_REASON}
                  isRequired
                />
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} vAlign="center">
                  <Button label="Cancel" variant="secondary" onClick={() => setPending(null)} />
                  <StackItem size="fill" />
                  <Button
                    label="Mark roadblocked"
                    variant="primary"
                    isDisabled={reason.trim().length === 0}
                    onClick={() => {
                      apply(pending.ticket, "BLOCKED", pending.index, reason.trim());
                      setPending(null);
                    }}
                  />
                </HStack>
              </LayoutFooter>
            }
          />
        </Dialog>
      ) : null}
    </VStack>
  );
}
