"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VoiceTextArea } from "../voice-text-area";
import type { AgentSchedule } from "@westride/db";
import { describeSchedule, isAgentSchedule } from "@westride/db/agent-rules";
import { AGENT_SCHEDULE_LABELS, AGENT_SCHEDULE_ORDER, WEEKDAY_LABELS } from "@/lib/agents/labels";
import { MAX_STANDING_TASK, type AgentScheduleDraft, type FieldErrors } from "@/lib/agents/schema";

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00 UTC`,
}));

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

/**
 * The schedule part of an agent form: cadence, slot, and the standing task
 * the agent files for itself when its backlog is empty.
 */
export function ScheduleFields({
  draft,
  errors,
  onChange,
}: {
  draft: AgentScheduleDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<AgentScheduleDraft>, touched: keyof AgentScheduleDraft) => void;
}) {
  const needsHour = draft.schedule === "DAILY" || draft.schedule === "WEEKLY";
  return (
    <>
      <Selector
        label="Runs"
        description="When the agent wakes up on its own. Each run takes the top of its backlog, or files the standing task."
        options={AGENT_SCHEDULE_ORDER.map((value: AgentSchedule) => ({
          value,
          label: AGENT_SCHEDULE_LABELS[value],
        }))}
        value={draft.schedule}
        onChange={(value) => {
          if (value && isAgentSchedule(value)) {
            onChange(
              {
                schedule: value,
                scheduleHourUtc:
                  value === "DAILY" || value === "WEEKLY" ? (draft.scheduleHourUtc ?? 9) : null,
                scheduleWeekday: value === "WEEKLY" ? (draft.scheduleWeekday ?? 1) : null,
              },
              "schedule",
            );
          }
        }}
      />
      {needsHour ? (
        <Selector
          label="At"
          options={HOURS}
          value={String(draft.scheduleHourUtc ?? 9)}
          onChange={(value) => onChange({ scheduleHourUtc: Number(value) }, "scheduleHourUtc")}
          status={fieldStatus(errors.scheduleHourUtc)}
        />
      ) : null}
      {draft.schedule === "WEEKLY" ? (
        <Selector
          label="On"
          options={WEEKDAY_LABELS.map((label, index) => ({ value: String(index), label }))}
          value={String(draft.scheduleWeekday ?? 1)}
          onChange={(value) => onChange({ scheduleWeekday: Number(value) }, "scheduleWeekday")}
          status={fieldStatus(errors.scheduleWeekday)}
        />
      ) : null}
      {draft.schedule !== "NONE" ? (
        <>
          <Text type="supporting">{describeSchedule(draft)}. Times are UTC.</Text>
          <VoiceTextArea
            label="Standing task"
            description="What the agent does on schedule when nothing is queued. The first line becomes the ticket title. Leave empty to only work queued tickets."
            value={draft.standingTask}
            onChange={(value) => onChange({ standingTask: value }, "standingTask")}
            rows={4}
            maxLength={MAX_STANDING_TASK}
            placeholder={"Weekly dependency check\nLook for outdated or vulnerable dependencies and open a pull request that updates the safe ones."}
            status={fieldStatus(errors.standingTask)}
          />
        </>
      ) : null}
    </>
  );
}
