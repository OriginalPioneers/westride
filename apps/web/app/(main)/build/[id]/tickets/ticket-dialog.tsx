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
import type { ProjectMilestone, ProjectRepo, TicketPriority } from "@westride/db";
import type { TicketWithDetails } from "@westride/db/build";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_ORDER,
  ticketPath,
} from "@/lib/build/labels";
import {
  MAX_TICKET_DESCRIPTION,
  MAX_TICKET_TITLE,
  validateTicketDraft,
  type FieldErrors,
  type TicketDraft,
} from "@/lib/build/schema";
import { createTicketAction, updateTicketAction } from "../../actions";

export type TicketMemberOption = { clerkUserId: string; name: string };

export type TicketDialogOptions = {
  projectId: string;
  milestones: ProjectMilestone[];
  repos: ProjectRepo[];
  members: TicketMemberOption[];
};

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

function isPriority(value: string): value is TicketPriority {
  return value in TICKET_PRIORITY_LABELS;
}

export function TicketDialog({
  isOpen,
  onOpenChange,
  options,
  ticket,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  options: TicketDialogOptions;
  /** Editing an existing ticket. Omit to create one. */
  ticket?: TicketWithDetails;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority ?? "MEDIUM");
  const [milestoneId, setMilestoneId] = useState<string | null>(ticket?.milestoneId ?? null);
  const [repoId, setRepoId] = useState<string | null>(
    ticket?.repoId ?? options.repos.find((repo) => repo.isPrimary)?.id ?? null,
  );
  const [assignee, setAssignee] = useState<string | null>(
    ticket?.assigneeClerkUserId ?? null,
  );
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const draft: TicketDraft = {
    title,
    description,
    priority,
    milestoneId,
    repoId,
    assigneeClerkUserId: assignee,
  };
  const errors: FieldErrors = {
    ...(submitted ? validateTicketDraft(draft) : {}),
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
    const nextErrors = validateTicketDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = ticket
          ? await updateTicketAction(options.projectId, ticket.id, draft)
          : await createTicketAction(options.projectId, draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        onOpenChange(false);
        if (ticket) {
          router.refresh();
        } else {
          router.push(ticketPath(options.projectId, result.ticket.number));
        }
      } catch (error) {
        console.error("Ticket save failed", error);
        setFormMessage("The ticket could not be saved. Try again.");
      }
    });
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={720}
      maxHeight={DIALOG_HEIGHT}
    >
      <Layout
        height="fill"
        header={
          <DialogHeader
            title={ticket ? "Edit ticket" : "New ticket"}
            hasDivider
            onOpenChange={handleOpenChange}
          />
        }
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
                placeholder="Add sign-in with email"
                description={`Up to ${MAX_TICKET_TITLE} characters.`}
                isRequired
                status={fieldStatus(errors.title)}
              />
              <TextArea
                label="What does done look like?"
                description="Write it as the brief you would hand a developer: the behaviour, where it lives, and how to check it. A Muse Code agent works from exactly this text. Markdown is fine."
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
                options={TICKET_PRIORITY_ORDER.map((value) => ({
                  value,
                  label: TICKET_PRIORITY_LABELS[value],
                }))}
                value={priority}
                onChange={(value) => {
                  if (value && isPriority(value)) {
                    setPriority(value);
                  }
                }}
              />
              {options.milestones.length > 0 ? (
                <Selector
                  label="Milestone"
                  placeholder="No milestone"
                  options={options.milestones.map((milestone) => ({
                    value: milestone.id,
                    label: milestone.title,
                  }))}
                  value={milestoneId}
                  onChange={(value) => {
                    setMilestoneId(value || null);
                    clearServer("milestoneId");
                  }}
                  hasClear
                  status={fieldStatus(errors.milestoneId)}
                />
              ) : null}
              {options.repos.length > 0 ? (
                <Selector
                  label="Repository"
                  description="Where the work lands."
                  placeholder="Project's primary repository"
                  options={options.repos.map((repo) => ({
                    value: repo.id,
                    label: `${repo.owner}/${repo.name}`,
                  }))}
                  value={repoId}
                  onChange={(value) => {
                    setRepoId(value || null);
                    clearServer("repoId");
                  }}
                  hasClear
                  status={fieldStatus(errors.repoId)}
                />
              ) : null}
              <Selector
                label="Assignee"
                placeholder="Unassigned"
                options={options.members.map((member) => ({
                  value: member.clerkUserId,
                  label: member.name,
                }))}
                value={assignee}
                onChange={(value) => {
                  setAssignee(value || null);
                  clearServer("assigneeClerkUserId");
                }}
                hasClear
                hasSearch={options.members.length > 8}
                status={fieldStatus(errors.assigneeClerkUserId)}
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
                isDisabled={isSaving}
                onClick={() => handleOpenChange(false)}
              />
              <StackItem size="fill" />
              <Button
                label={ticket ? "Save" : "Create ticket"}
                variant="primary"
                isLoading={isSaving}
                onClick={save}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
