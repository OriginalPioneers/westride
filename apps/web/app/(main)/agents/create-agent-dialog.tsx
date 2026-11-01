"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { agentPath } from "@/lib/agents/labels";
import {
  DEFAULT_AGENT_STEPS,
  MAX_AGENT_DESCRIPTION,
  MAX_AGENT_INSTRUCTIONS,
  MAX_AGENT_NAME,
  MAX_AGENT_STEPS,
  MAX_TICKET_TITLE,
  MIN_AGENT_STEPS,
  validateAgentDraft,
  type AgentDraft,
  type AgentScheduleDraft,
  type FieldErrors,
} from "@/lib/agents/schema";
import { DEFAULT_MUSE_MODEL, MUSE_MODELS, getMuseModel } from "@/lib/idea-factory/pricing";
import { createAgentAction } from "./actions";
import { ScheduleFields } from "./schedule-fields";

export type LinkOption = { id: string; name: string };

export type CreateAgentOptions = {
  ideas: LinkOption[];
  projects: LinkOption[];
  /** Whether this server can run Muse Code in a sandbox. */
  canRunCode: boolean;
  /** Preselected links, when opened from a project or idea page. */
  defaults?: { ideaId?: string | null; projectId?: string | null };
};

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function CreateAgentDialog({
  isOpen,
  onOpenChange,
  options,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  options: CreateAgentOptions;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<AgentDraft>({
    name: "",
    description: "",
    instructions: "",
    isPublic: false,
    ideaId: options.defaults?.ideaId ?? null,
    projectId: options.defaults?.projectId ?? null,
    model: DEFAULT_MUSE_MODEL,
    maxSteps: DEFAULT_AGENT_STEPS,
    allowSponsorTokens: false,
    allowVolunteerCompute: false,
    volunteerLocalModel: null,
    githubRepoUrl: "",
    schedule: "NONE",
    scheduleHourUtc: null,
    scheduleWeekday: null,
    standingTask: "",
    firstTicket: "",
  });
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const errors: FieldErrors = {
    ...(submitted ? validateAgentDraft(draft) : {}),
    ...serverErrors,
  };
  const modelOption = getMuseModel(draft.model);

  function patch(changes: Partial<AgentDraft>, touched: keyof AgentDraft) {
    setDraft((current) => ({ ...current, ...changes }));
    setServerErrors((current) => {
      if (!(touched in current)) {
        return current;
      }
      const next = { ...current };
      delete next[touched];
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
    const nextErrors = validateAgentDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = await createAgentAction(draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        onOpenChange(false);
        router.push(agentPath(result.agentId));
      } catch (error) {
        console.error("Agent create failed", error);
        setFormMessage("The agent could not be created. Try again.");
      }
    });
  }

  const scheduleDraft: AgentScheduleDraft = {
    schedule: draft.schedule,
    scheduleHourUtc: draft.scheduleHourUtc,
    scheduleWeekday: draft.scheduleWeekday,
    standingTask: draft.standingTask,
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} purpose="form" width={760} maxHeight={DIALOG_HEIGHT}>
      <Layout
        height="fill"
        header={<DialogHeader title="New agent" hasDivider onOpenChange={handleOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={8}>
              <FormLayout defaultOptionality="optional">
                {formMessage ? <Banner status="error" title={formMessage} /> : null}
                <Text type="supporting">
                  An agent is a Muse persona with its own backlog. Give it a job, point it at a
                  repository if it writes code, and it works tickets on request or on a schedule.
                  Your own Meta key pays for every run.
                </Text>
                <TextInput
                  label="Name"
                  value={draft.name}
                  onChange={(value) => patch({ name: value }, "name")}
                  placeholder="Release notes writer"
                  description={`Up to ${MAX_AGENT_NAME} characters.`}
                  isRequired
                  status={fieldStatus(errors.name)}
                />
                <TextArea
                  label="What it does"
                  description="One or two sentences. The agent reads this as who it is."
                  value={draft.description}
                  onChange={(value) => patch({ description: value }, "description")}
                  rows={3}
                  maxLength={MAX_AGENT_DESCRIPTION}
                  isRequired
                  status={fieldStatus(errors.description)}
                />
                <TextArea
                  label="Standing instructions"
                  description="Rules it follows on every job: tone, files to respect, what never to touch. Markdown is fine."
                  value={draft.instructions}
                  onChange={(value) => patch({ instructions: value }, "instructions")}
                  rows={5}
                  maxLength={MAX_AGENT_INSTRUCTIONS}
                  status={fieldStatus(errors.instructions)}
                />
                <SegmentedControl
                  label="Who can see it"
                  value={draft.isPublic ? "public" : "private"}
                  onChange={(value) => patch({ isPublic: value === "public" }, "isPublic")}
                >
                  <SegmentedControlItem value="private" label="Private · you and linked teams" />
                  <SegmentedControlItem value="public" label="Public · anyone on WeStride" />
                </SegmentedControl>
              </FormLayout>

              <VStack gap={4}>
                <VStack gap={1}>
                  <Heading level={3}>Where it works</Heading>
                  <Text type="supporting">
                    Linking is optional. Members of a linked project or idea can queue tickets and
                    run the agent on their own key.
                  </Text>
                </VStack>
                <FormLayout defaultOptionality="optional">
                  {options.projects.length > 0 ? (
                    <Selector
                      label="Project"
                      placeholder="No project"
                      options={options.projects.map((project) => ({ value: project.id, label: project.name }))}
                      value={draft.projectId}
                      onChange={(value) => patch({ projectId: value || null }, "projectId")}
                      hasClear
                      hasSearch={options.projects.length > 8}
                      status={fieldStatus(errors.projectId)}
                    />
                  ) : null}
                  {options.ideas.length > 0 ? (
                    <Selector
                      label="Idea"
                      placeholder="No idea"
                      options={options.ideas.map((idea) => ({ value: idea.id, label: idea.name }))}
                      value={draft.ideaId}
                      onChange={(value) => patch({ ideaId: value || null }, "ideaId")}
                      hasClear
                      hasSearch={options.ideas.length > 8}
                      status={fieldStatus(errors.ideaId)}
                    />
                  ) : null}
                  <TextInput
                    label="GitHub repository"
                    description={
                      options.canRunCode
                        ? "With a repository, jobs run as Muse Code in a sandbox and end in a pull request. Without one, jobs are written reports."
                        : "Saved for later: this server cannot run Muse Code sandboxes yet, so jobs run as written reports."
                    }
                    value={draft.githubRepoUrl}
                    onChange={(value) => patch({ githubRepoUrl: value }, "githubRepoUrl")}
                    placeholder="https://github.com/owner/repo"
                    status={fieldStatus(errors.githubRepoUrl)}
                  />
                </FormLayout>
              </VStack>

              <VStack gap={4}>
                <Heading level={3}>Model</Heading>
                <FormLayout defaultOptionality="optional">
                  <Selector
                    label="Muse model"
                    options={MUSE_MODELS.map((option) => ({ value: option.id, label: option.label }))}
                    value={draft.model}
                    onChange={(value) => {
                      if (value) {
                        patch({ model: value }, "model");
                      }
                    }}
                    description={modelOption?.description}
                    status={fieldStatus(errors.model)}
                  />
                  {modelOption?.isContributor ? (
                    <Banner
                      status="warning"
                      title="Contributor model"
                      description="Runs in contributor mode; Meta may use the session to improve its models."
                    />
                  ) : null}
                  <NumberInput
                    label="Step budget per job"
                    description={`Model steps before a code job stops. ${MIN_AGENT_STEPS}–${MAX_AGENT_STEPS}.`}
                    value={draft.maxSteps}
                    onChange={(value) =>
                      patch(
                        { maxSteps: Math.min(MAX_AGENT_STEPS, Math.max(MIN_AGENT_STEPS, Math.round(value))) },
                        "maxSteps",
                      )
                    }
                    min={MIN_AGENT_STEPS}
                    max={MAX_AGENT_STEPS}
                    step={10}
                  />
                </FormLayout>
              </VStack>

              <VStack gap={4}>
                <Heading level={3}>Schedule</Heading>
                <FormLayout defaultOptionality="optional">
                  <ScheduleFields
                    draft={scheduleDraft}
                    errors={errors}
                    onChange={(changes, touched) => patch(changes, touched)}
                  />
                </FormLayout>
              </VStack>

              <VStack gap={4}>
                <Heading level={3}>First ticket</Heading>
                <FormLayout defaultOptionality="optional">
                  <TextInput
                    label="Queue something to start with"
                    description={`You can add detail on the ticket afterwards. Up to ${MAX_TICKET_TITLE} characters.`}
                    value={draft.firstTicket}
                    onChange={(value) => patch({ firstTicket: value }, "firstTicket")}
                    placeholder="Draft release notes for the last 10 merged pull requests"
                    status={fieldStatus(errors.firstTicket)}
                  />
                </FormLayout>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button label="Cancel" variant="secondary" isDisabled={isSaving} onClick={() => handleOpenChange(false)} />
              <StackItem size="fill" />
              <Button label="Create agent" variant="primary" isLoading={isSaving} onClick={save} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
