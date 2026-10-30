"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { MilestoneStatus, ProjectMilestone } from "@westride/db";
import { MILESTONE_STATUS_LABELS } from "@/lib/build/labels";
import {
  MAX_MILESTONE_DESCRIPTION,
  MAX_MILESTONE_TITLE,
  milestoneSchema,
  fieldErrorsFrom,
  type FieldErrors,
} from "@/lib/build/schema";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  updateMilestoneAction,
} from "../../actions";

const STATUSES: MilestoneStatus[] = ["PLANNED", "ACTIVE", "COMPLETED"];

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

function isIsoDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isStatus(value: string): value is MilestoneStatus {
  return value in MILESTONE_STATUS_LABELS;
}

function MilestoneDialog({
  projectId,
  milestone,
  isOpen,
  onOpenChange,
}: {
  projectId: string;
  milestone: ProjectMilestone | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? "PLANNED");
  const [targetDate, setTargetDate] = useState(milestone?.targetDate ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const draft = { title, description, status, targetDate };

  function save() {
    const parsed = milestoneSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      setMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      const result = milestone
        ? await updateMilestoneAction(projectId, milestone.id, draft)
        : await createMilestoneAction(projectId, draft);
      if (result.status === "error") {
        setErrors(result.fieldErrors);
        setMessage(result.message);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={560}>
      <Layout
        header={
          <DialogHeader
            title={milestone ? "Edit milestone" : "New milestone"}
            hasDivider
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <FormLayout defaultOptionality="optional">
              {message ? <Banner status="error" title={message} /> : null}
              <TextInput
                label="Title"
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setErrors({});
                }}
                placeholder="Private beta"
                description={`Up to ${MAX_MILESTONE_TITLE} characters.`}
                isRequired
                status={fieldStatus(errors.title)}
              />
              <TextArea
                label="What it delivers"
                value={description}
                onChange={setDescription}
                rows={3}
                maxLength={MAX_MILESTONE_DESCRIPTION}
                status={fieldStatus(errors.description)}
              />
              <Selector
                label="Status"
                options={STATUSES.map((value) => ({
                  value,
                  label: MILESTONE_STATUS_LABELS[value],
                }))}
                value={status}
                onChange={(value) => {
                  if (value && isStatus(value)) {
                    setStatus(value);
                  }
                }}
              />
              <DateInput
                label="Target date"
                value={isIsoDate(targetDate) ? targetDate : undefined}
                onChange={(value) => {
                  setTargetDate(value ?? "");
                  setErrors({});
                }}
                status={fieldStatus(errors.targetDate)}
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
                onClick={() => onOpenChange(false)}
              />
              <StackItem size="fill" />
              <Button
                label={milestone ? "Save" : "Add milestone"}
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

export function MilestoneSettings({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: ProjectMilestone[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProjectMilestone | null | undefined>(undefined);
  const [session, setSession] = useState(0);
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open(milestone: ProjectMilestone | null) {
    setSession((current) => current + 1);
    setEditing(milestone);
  }

  function remove(milestone: ProjectMilestone) {
    setError(null);
    startDeleting(async () => {
      const result = await deleteMilestoneAction(projectId, milestone.id);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Text type="supporting">
            The roadmap, in order. Tickets can belong to a milestone. Muse
            planning can propose these later.
          </Text>
        </StackItem>
        <Button
          label="New milestone"
          variant="secondary"
          icon={<Icon icon={PlusIcon} />}
          onClick={() => open(null)}
        />
      </HStack>
      {error ? <Banner status="error" title={error} /> : null}
      {milestones.length > 0 ? (
        <List>
          {milestones.map((milestone) => (
            <ListItem
              key={milestone.id}
              label={milestone.title}
              description={[
                MILESTONE_STATUS_LABELS[milestone.status],
                milestone.targetDate ? `target ${milestone.targetDate}` : null,
                milestone.description || null,
              ]
                .filter(Boolean)
                .join(" · ")}
              endContent={
                <HStack gap={1} vAlign="center">
                  <IconButton
                    label={`Edit ${milestone.title}`}
                    tooltip="Edit"
                    icon={<Icon icon={PencilSquareIcon} />}
                    variant="ghost"
                    onClick={() => open(milestone)}
                  />
                  <IconButton
                    label={`Delete ${milestone.title}`}
                    tooltip="Delete"
                    icon={<Icon icon={TrashIcon} />}
                    variant="ghost"
                    isDisabled={isDeleting}
                    onClick={() => remove(milestone)}
                  />
                </HStack>
              }
            />
          ))}
        </List>
      ) : (
        <Text type="supporting">No milestones yet.</Text>
      )}
      {editing !== undefined ? (
        <MilestoneDialog
          key={session}
          projectId={projectId}
          milestone={editing}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditing(undefined);
            }
          }}
        />
      ) : null}
    </VStack>
  );
}
