"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { AgentTicket, TicketStatus } from "@westride/db";
import { TICKET_STATUSES } from "@westride/db/agent-rules";
import { TICKET_STATUS_LABELS, agentTicketsPath } from "@/lib/agents/labels";
import { MAX_BLOCKED_REASON } from "@/lib/agents/schema";
import { deleteAgentTicketAction, moveAgentTicketAction } from "../../../ticket-actions";
import { AgentTicketDialog } from "../ticket-dialog";

function isStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

/** Status selector. Moving to Roadblocked asks what is in the way first. */
export function AgentTicketStatusControl({ ticket }: { ticket: AgentTicket }) {
  const router = useRouter();
  const [isMoving, startMoving] = useTransition();
  const [pendingBlock, setPendingBlock] = useState(false);
  const [reason, setReason] = useState(ticket.blockedReason ?? "");
  const [error, setError] = useState<string | null>(null);

  function move(status: TicketStatus, blockedReason = "") {
    setError(null);
    startMoving(async () => {
      const result = await moveAgentTicketAction(ticket.agentId, ticket.id, { status, blockedReason });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPendingBlock(false);
      router.refresh();
    });
  }

  const closeBlock = (open: boolean) => {
    if (!isMoving) {
      setPendingBlock(open);
    }
  };

  return (
    <>
      <Selector
        label="Status"
        value={ticket.status}
        size="sm"
        variant="secondary"
        isDisabled={isMoving}
        options={TICKET_STATUSES.map((status) => ({ value: status, label: TICKET_STATUS_LABELS[status] }))}
        onChange={(value) => {
          if (!value || !isStatus(value) || value === ticket.status) {
            return;
          }
          if (value === "BLOCKED") {
            setPendingBlock(true);
            return;
          }
          move(value);
        }}
        status={error && !pendingBlock ? { type: "error", message: error } : undefined}
        statusVariant="detached"
      />
      <Dialog isOpen={pendingBlock} onOpenChange={closeBlock} purpose="form" width={520}>
        <Layout
          header={<DialogHeader title="What is blocking this ticket?" hasDivider onOpenChange={closeBlock} />}
          content={
            <LayoutContent>
              <FormLayout>
                {error ? <Banner status="error" title={error} /> : null}
                <TextArea
                  label="Roadblock"
                  description="Say what has to change before the agent should try again. It reads this on the next run."
                  value={reason}
                  onChange={setReason}
                  rows={4}
                  maxLength={MAX_BLOCKED_REASON}
                  isRequired
                  placeholder="The API key for the data source has expired."
                />
              </FormLayout>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} vAlign="center">
                <Button label="Cancel" variant="secondary" isDisabled={isMoving} onClick={() => setPendingBlock(false)} />
                <StackItem size="fill" />
                <Button label="Mark roadblocked" variant="primary" isLoading={isMoving} onClick={() => move("BLOCKED", reason)} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}

export function EditAgentTicketButton({ ticket, runsCode }: { ticket: AgentTicket; runsCode: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        label="Edit"
        variant="secondary"
        icon={<Icon icon={PencilSquareIcon} />}
        onClick={() => {
          setSession((current) => current + 1);
          setIsOpen(true);
        }}
      />
      {isOpen ? (
        <AgentTicketDialog
          key={session}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          agentId={ticket.agentId}
          runsCode={runsCode}
          ticket={ticket}
        />
      ) : null}
    </>
  );
}

export function DeleteAgentTicketButton({ ticket }: { ticket: AgentTicket }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    startDeleting(async () => {
      const result = await deleteAgentTicketAction(ticket.agentId, ticket.id);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.push(agentTicketsPath(ticket.agentId));
    });
  }

  const close = (open: boolean) => {
    if (!isDeleting) {
      setIsConfirming(open);
    }
  };

  return (
    <>
      <Button label="Delete" variant="ghost" icon={<Icon icon={TrashIcon} />} onClick={() => setIsConfirming(true)} />
      <Dialog isOpen={isConfirming} onOpenChange={close} purpose="form" width={480}>
        <Layout
          header={<DialogHeader title="Delete this ticket?" hasDivider onOpenChange={close} />}
          content={
            <LayoutContent>
              {error ? <Banner status="error" title={error} /> : null}
              <Text>
                &ldquo;{ticket.title}&rdquo; will be removed from the agent&apos;s backlog. Its past jobs stay in
                the job list. This cannot be undone.
              </Text>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} vAlign="center">
                <Button label="Keep it" variant="secondary" isDisabled={isDeleting} onClick={() => setIsConfirming(false)} />
                <StackItem size="fill" />
                <Button label="Delete ticket" variant="destructive" isLoading={isDeleting} onClick={remove} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
