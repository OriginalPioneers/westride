"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { validateAgentSchedule, type AgentScheduleDraft, type FieldErrors } from "@/lib/agents/schema";
import { updateAgentScheduleAction } from "../../actions";
import { ScheduleFields } from "../../schedule-fields";

export function AgentScheduleForm({
  agentId,
  initial,
  isActive,
  ownerHasMetaConnection,
  cronConfigured,
}: {
  agentId: string;
  initial: AgentScheduleDraft;
  isActive: boolean;
  ownerHasMetaConnection: boolean;
  /** Whether a scheduler is wired to this server; otherwise page visits run due work. */
  cronConfigured: boolean;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<AgentScheduleDraft>(initial);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const errors: FieldErrors = {
    ...(submitted ? validateAgentSchedule(draft) : {}),
    ...serverErrors,
  };

  function save() {
    setSubmitted(true);
    const nextErrors = validateAgentSchedule(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      try {
        const result = await updateAgentScheduleAction(agentId, draft);
        if (result.status === "error") {
          setServerErrors(result.fieldErrors);
          setFormMessage(result.message);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch (error) {
        console.error("Schedule save failed", error);
        setFormMessage("The schedule could not be saved. Try again.");
      }
    });
  }

  return (
    <VStack gap={6}>
      <Text type="supporting">
        Scheduled jobs run on your Meta key, since you own the agent. Each run takes the highest-priority
        backlog ticket, or files the standing task when the backlog is empty.
      </Text>
      {!ownerHasMetaConnection && draft.schedule !== "NONE" ? (
        <Banner
          status="warning"
          title="Connect your Meta account"
          description="Scheduled runs are skipped until your Meta account is connected in Settings."
          collapsible={false}
        >
          <Button label="Open settings" href="/settings" variant="secondary" />
        </Banner>
      ) : null}
      {!cronConfigured && draft.schedule !== "NONE" ? (
        <Banner
          status="info"
          title="No scheduler is wired to this server"
          description="Due work runs when someone opens Agent Studio. Set CRON_SECRET and a cron job for exact timing; see docs/agent-studio.md."
        />
      ) : null}
      {!isActive && draft.schedule !== "NONE" ? (
        <Banner status="info" title="The agent is paused" description="The schedule is kept, but nothing runs until it is resumed." />
      ) : null}
      {formMessage ? <Banner status="error" title={formMessage} /> : null}
      {saved ? <Banner status="success" title="Saved." /> : null}
      <FormLayout defaultOptionality="optional">
        <ScheduleFields
          draft={draft}
          errors={errors}
          onChange={(changes, touched) => {
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
          }}
        />
      </FormLayout>
      <HStack gap={2} vAlign="center">
        <StackItem size="fill" />
        <Button label="Save schedule" variant="primary" isLoading={isSaving} onClick={save} />
      </HStack>
    </VStack>
  );
}
