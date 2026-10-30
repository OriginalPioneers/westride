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
import type { TicketStatus } from "@westride/db";
import type { TicketWithDetails } from "@westride/db/build";
import { TICKET_STATUSES } from "@westride/db/build-rules";
import { TICKET_STATUS_LABELS, ticketsPath } from "@/lib/build/labels";
import { MAX_BLOCKED_REASON } from "@/lib/build/schema";
import { deleteTicketAction, moveTicketAction } from "../../../actions";
import { TicketDialog, type TicketDialogOptions } from "../ticket-dialog";

function isStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

/** Status selector. Moving to Roadblocked asks what is in the way first. */
export function TicketStatusControl({
  ticket,
}: {
  ticket: TicketWithDetails;
}) {
  const router = useRouter();
  const [isMoving, startMoving] = useTransition();
  const [pendingBlock, setPendingBlock] = useState(false);
  const [reason, setReason] = useState(ticket.blockedReason ?? "");
  const [error, setError] = useState<string | null>(null);

  function move(status: TicketStatus, blockedReason = "") {
    setError(null);
    startMoving(async () => {
      const result = await moveTicketAction(ticket.projectId, ticket.id, {
        status,
        blockedReason,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPendingBlock(false);
      router.refresh();
    });
  }

  return (
    <>
      <Selector
        label="Status"
        value={ticket.status}
        size="sm"
        variant="secondary"
        isDisabled={isMoving}
        options={TICKET_STATUSES.map((status) => ({
          value: status,
          label: TICKET_STATUS_LABELS[status],
        }))}
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
      <Dialog
        isOpen={pendingBlock}
        onOpenChange={(open) => {
          if (!isMoving) {
            setPendingBlock(open);
          }
        }}
        purpose="form"
        width={520}
      >
        <Layout
          header={
            <DialogHeader
              title="What is blocking this ticket?"
              hasDivider
              onOpenChange={(open) => {
                if (!isMoving) {
                  setPendingBlock(open);
                }
              }}
            />
          }
          content={
            <LayoutContent>
              <FormLayout>
                {error ? <Banner status="error" title={error} /> : null}
                <TextArea
                  label="Roadblock"
                  description="Say what has to change before work can continue. The team sees this on the ticket."
                  value={reason}
                  onChange={setReason}
                  rows={4}
                  maxLength={MAX_BLOCKED_REASON}
                  isRequired
                  placeholder="Waiting on the payment provider to approve the account."
                />
              </FormLayout>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} vAlign="center">
                <Button
                  label="Cancel"
                  variant="secondary"
                  isDisabled={isMoving}
                  onClick={() => setPendingBlock(false)}
                />
                <StackItem size="fill" />
                <Button
                  label="Mark roadblocked"
                  variant="primary"
                  isLoading={isMoving}
                  onClick={() => move("BLOCKED", reason)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}

export function EditTicketButton({
  ticket,
  options,
}: {
  ticket: TicketWithDetails;
  options: TicketDialogOptions;
}) {
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
        <TicketDialog
          key={session}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          options={options}
          ticket={ticket}
        />
      ) : null}
    </>
  );
}

export function DeleteTicketButton({ ticket }: { ticket: TicketWithDetails }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    startDeleting(async () => {
      const result = await deleteTicketAction(ticket.projectId, ticket.id);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.push(ticketsPath(ticket.projectId));
    });
  }

  return (
    <>
      <Button
        label="Delete"
        variant="ghost"
        icon={<Icon icon={TrashIcon} />}
        onClick={() => setIsConfirming(true)}
      />
      <Dialog
        isOpen={isConfirming}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsConfirming(open);
          }
        }}
        purpose="form"
        width={480}
      >
        <Layout
          header={
            <DialogHeader
              title="Delete this ticket?"
              hasDivider
              onOpenChange={(open) => {
                if (!isDeleting) {
                  setIsConfirming(open);
                }
              }}
            />
          }
          content={
            <LayoutContent>
              {error ? <Banner status="error" title={error} /> : null}
              <Text>
                &ldquo;{ticket.title}&rdquo; will be removed from the project. This
                cannot be undone.
              </Text>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} vAlign="center">
                <Button
                  label="Keep it"
                  variant="secondary"
                  isDisabled={isDeleting}
                  onClick={() => setIsConfirming(false)}
                />
                <StackItem size="fill" />
                <Button
                  label="Delete ticket"
                  variant="destructive"
                  isLoading={isDeleting}
                  onClick={remove}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
