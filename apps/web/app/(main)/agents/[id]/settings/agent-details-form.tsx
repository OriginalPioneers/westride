"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VoiceTextArea } from "../../../voice-text-area";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  MAX_AGENT_DESCRIPTION,
  MAX_AGENT_INSTRUCTIONS,
  MAX_AGENT_NAME,
  MAX_AGENT_STEPS,
  MAX_LOCAL_MODEL,
  MIN_AGENT_STEPS,
  validateAgentDetails,
  type AgentDetailsDraft,
  type FieldErrors,
} from "@/lib/agents/schema";
import { MUSE_MODELS, getMuseModel } from "@/lib/idea-factory/pricing";
import { updateAgentDetailsAction } from "../../actions";
import type { LinkOption } from "../../create-agent-dialog";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function AgentDetailsForm({
  agentId,
  initial,
  ideas,
  projects,
}: {
  agentId: string;
  initial: AgentDetailsDraft;
  ideas: LinkOption[];
  projects: LinkOption[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<AgentDetailsDraft>(initial);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const errors: FieldErrors = {
    ...(submitted ? validateAgentDetails(draft) : {}),
    ...serverErrors,
  };
  const modelOption = getMuseModel(draft.model);

  function patch(changes: Partial<AgentDetailsDraft>, touched: keyof AgentDetailsDraft) {
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
    setSaved(false);
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateAgentDetails(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = await updateAgentDetailsAction(agentId, draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch (error) {
        console.error("Agent update failed", error);
        setFormMessage("The agent could not be saved. Try again.");
      }
    });
  }

  // Keep a linked idea or project selectable even if the viewer has since left it.
  const projectOptions = projects.some((project) => project.id === draft.projectId) || !draft.projectId
    ? projects
    : [...projects, { id: draft.projectId, name: "Linked project" }];
  const ideaOptions = ideas.some((idea) => idea.id === draft.ideaId) || !draft.ideaId
    ? ideas
    : [...ideas, { id: draft.ideaId, name: "Linked idea" }];

  return (
    <VStack gap={6}>
      {formMessage ? <Banner status="error" title={formMessage} /> : null}
      {saved ? <Banner status="success" title="Saved." /> : null}
      <FormLayout defaultOptionality="optional">
        <TextInput
          label="Name"
          value={draft.name}
          onChange={(value) => patch({ name: value }, "name")}
          description={`Up to ${MAX_AGENT_NAME} characters. Ticket keys use its initials.`}
          isRequired
          status={fieldStatus(errors.name)}
        />
        <VoiceTextArea
          label="What it does"
          value={draft.description}
          onChange={(value) => patch({ description: value }, "description")}
          rows={3}
          maxLength={MAX_AGENT_DESCRIPTION}
          isRequired
          status={fieldStatus(errors.description)}
        />
        <VoiceTextArea
          label="Standing instructions"
          description="Rules it follows on every job. Markdown is fine."
          value={draft.instructions}
          onChange={(value) => patch({ instructions: value }, "instructions")}
          rows={6}
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
        <Selector
          label="Project"
          placeholder="No project"
          options={projectOptions.map((project) => ({ value: project.id, label: project.name }))}
          value={draft.projectId}
          onChange={(value) => patch({ projectId: value || null }, "projectId")}
          hasClear
          hasSearch={projectOptions.length > 8}
          status={fieldStatus(errors.projectId)}
        />
        <Selector
          label="Idea"
          placeholder="No idea"
          options={ideaOptions.map((idea) => ({ value: idea.id, label: idea.name }))}
          value={draft.ideaId}
          onChange={(value) => patch({ ideaId: value || null }, "ideaId")}
          hasClear
          hasSearch={ideaOptions.length > 8}
          status={fieldStatus(errors.ideaId)}
        />
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
            patch({ maxSteps: Math.min(MAX_AGENT_STEPS, Math.max(MIN_AGENT_STEPS, Math.round(value))) }, "maxSteps")
          }
          min={MIN_AGENT_STEPS}
          max={MAX_AGENT_STEPS}
          step={10}
        />
      </FormLayout>
      <VStack gap={3}>
        <Heading level={3}>Supporters</Heading>
        <Text color="secondary">
          Supporters pledge to the idea this agent is linked to. Each kind of help is off until you turn it on.
        </Text>
        <CheckboxInput
          label="Accept token pledges"
          description="When a supporter has pledged tokens to the linked idea, their Meta key pays for this agent's jobs, up to their cap. Your model choice still applies."
          value={draft.allowSponsorTokens}
          onChange={(value) => patch({ allowSponsorTokens: value }, "allowSponsorTokens")}
          isDisabled={!draft.ideaId}
          disabledMessage="Link this agent to an idea first."
        />
        <CheckboxInput
          label="Run code jobs on supporters' computers"
          description="Code jobs go to a supporter's computer that has pledged compute to the linked idea, instead of a sandbox. Public repositories only; the computer never receives GitHub access, WeStride commits what it returns."
          value={draft.allowVolunteerCompute}
          onChange={(value) => patch({ allowVolunteerCompute: value }, "allowVolunteerCompute")}
          isDisabled={!draft.ideaId}
          disabledMessage="Link this agent to an idea first."
        />
        {draft.allowVolunteerCompute ? (
          <TextInput
            label="Local model for supporters without a Meta key"
            description="An Ollama model name, like llama3.1:8b. A supporter's computer with that model can run jobs with no Meta key at all. Leave empty to require a Meta key."
            value={draft.volunteerLocalModel ?? ""}
            onChange={(value) => patch({ volunteerLocalModel: value.slice(0, MAX_LOCAL_MODEL) || null }, "volunteerLocalModel")}
            status={fieldStatus(errors.volunteerLocalModel)}
          />
        ) : null}
        {!draft.ideaId ? <Text type="supporting">Link this agent to an idea to accept support.</Text> : null}
      </VStack>
      <HStack gap={2} vAlign="center">
        <StackItem size="fill" />
        <Button label="Save changes" variant="primary" isLoading={isSaving} onClick={save} />
      </HStack>
    </VStack>
  );
}
