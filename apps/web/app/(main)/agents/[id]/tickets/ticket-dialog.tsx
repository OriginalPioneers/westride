"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { AgentTicket, TicketPriority } from "@westride/db";
import { TICKET_PRIORITY_LABELS, TICKET_PRIORITY_ORDER, agentTicketPath } from "@/lib/agents/labels";
import {
  MAX_TICKET_DESCRIPTION,
  MAX_TICKET_TITLE,
  validateAgentTicketDraft,
  type AgentTicketDraft,
  type FieldErrors,
} from "@/lib/agents/schema";
import { createAgentTicketAction, updateAgentTicketAction } from "../../ticket-actions";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

function isPriority(value: string): value is TicketPriority {
  return value in TICKET_PRIORITY_LABELS;
}

export function AgentTicketDialog({
  isOpen,
  onOpenChange,
  agentId,
  runsCode,
  ticket,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  agentId: string;
  runsCode: boolean;
  /** Editing an existing ticket. Omit to create one. */
  ticket?: AgentTicket;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority ?? "MEDIUM");
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const draft: AgentTicketDraft = { title, description, priority };
  const errors: FieldErrors = {
    ...(submitted ? validateAgentTicketDraft(draft) : {}),
    ...serverErrors,
  };

  function clearServer(key: string) {
    setServerErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormMessage(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && isSaving) {
      return;
    }
    onOpenChange(next);
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateAgentTicketDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = ticket
          ? await updateAgentTicketAction(agentId, ticket.id, draft)
          : await createAgentTicketAction(agentId, draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        onOpenChange(false);
        if (ticket) {
          router.refresh();
        } else {
          router.push(agentTicketPath(agentId, result.ticket.number));
        }
      } catch (error) {
        console.error("Agent ticket save failed", error);
        setFormMessage("The ticket could not be saved. Try again.");
      }
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} purpose="form" width={720} maxHeight={DIALOG_HEIGHT}>
      <Layout
        height="fill"
        header={<DialogHeader title={ticket ? "Edit ticket" : "New ticket"} hasDivider onOpenChange={handleOpenChange} />}
        content={
          <LayoutContent>
            <FormLayout defaultOptionality="optional">
              {formMessage ? <Banner status="error" title={formMessage} /> : null}
              <TextInput
                label="Title"
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  clearServer("title");
                }}
                placeholder={runsCode ? "Add a changelog entry for the last release" : "Summarise this week's competitor launches"}
                description={`Up to ${MAX_TICKET_TITLE} characters.`}
                isRequired
                status={fieldStatus(errors.title)}
              />
              <TextArea
                label="What does done look like?"
                description={
                  runsCode
                    ? "The brief the agent works from in the repository: the behaviour, where it lives, how to check it. Markdown is fine."
                    : "The brief the agent answers: what to find out, for whom, and what shape the write-up should take. Markdown is fine."
                }
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  clearServer("description");
                }}
                rows={8}
                maxLength={MAX_TICKET_DESCRIPTION}
                status={fieldStatus(errors.description)}
              />
              <Selector
                label="Priority"
                description="Scheduled runs take the highest-priority backlog ticket first."
                options={TICKET_PRIORITY_ORDER.map((value) => ({ value, label: TICKET_PRIORITY_LABELS[value] }))}
                value={priority}
                onChange={(value) => {
                  if (value && isPriority(value)) {
                    setPriority(value);
                  }
                }}
              />
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button label="Cancel" variant="secondary" isDisabled={isSaving} onClick={() => handleOpenChange(false)} />
              <StackItem size="fill" />
              <Button label={ticket ? "Save" : "Queue ticket"} variant="primary" isLoading={isSaving} onClick={save} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
