import "server-only";

import type { Agent, AgentTicket } from "@westride/db";
import {
  addAgentLog,
  claimDueAgents,
  createAgentTicket,
  hasDueAgents,
  nextQueuedAgentTicket,
} from "@westride/db/agents";
import { resolveJobPayer } from "@/lib/support/payer";
import { SCHEDULE_BATCH_SIZE } from "./config";
import { AgentJobError, canRunCode, startAgentJob } from "./start";

export type ScheduleTickResult = {
  claimed: number;
  started: string[];
  skipped: { agentId: string; reason: string }[];
};

/**
 * What a scheduled agent works on: the top of its backlog, or a fresh
 * ticket from its standing task. An agent with neither has nothing to do.
 */
async function pickScheduledTicket(agent: Agent): Promise<AgentTicket | null> {
  const queued = await nextQueuedAgentTicket(agent.id);
  if (queued) {
    return queued;
  }
  const task = agent.standingTask.trim();
  if (!task) {
    return null;
  }
  const [firstLine, ...rest] = task.split("\n");
  const title = (firstLine ?? task).replace(/^#+\s*/, "").trim().slice(0, 160) || "Scheduled work";
  const description = rest.join("\n").trim() || task;
  return createAgentTicket(agent.id, {
    title,
    description: description === title ? "" : description,
    priority: "MEDIUM",
    source: "SCHEDULE",
    createdByClerkUserId: null,
  });
}

/**
 * Claims every agent whose slot has come and starts one job each, on the
 * owner's Meta key or a sponsor's. Claiming is atomic, so the cron route and the
 * opportunistic page ticks can both call this without doubling up.
 */
export async function runDueAgents(now = new Date()): Promise<ScheduleTickResult> {
  const due = await claimDueAgents(now, SCHEDULE_BATCH_SIZE);
  const result: ScheduleTickResult = { claimed: due.length, started: [], skipped: [] };

  for (const { agent } of due) {
    try {
      const ticket = await pickScheduledTicket(agent);
      if (!ticket) {
        result.skipped.push({ agentId: agent.id, reason: "nothing queued" });
        await addAgentLog(agent.id, {
          kind: "schedule",
          message: "Scheduled slot passed with nothing queued and no standing task.",
        });
        continue;
      }
      const payer = await resolveJobPayer(agent, agent.ownerClerkUserId, {
        needsCompute: canRunCode(agent),
      });
      const started = await startAgentJob({
        agent,
        ticket,
        trigger: "SCHEDULE",
        startedByClerkUserId: null,
        payerClerkUserId: payer.clerkUserId,
        pledgeId: payer.pledgeId,
        instructions: "",
      });
      result.started.push(started.jobId);
      if (started.work) {
        // Report jobs run inline here; the tick is already in the background.
        await started.work();
      }
    } catch (error) {
      const message = error instanceof AgentJobError ? error.message : "The scheduled job could not start.";
      if (!(error instanceof AgentJobError)) {
        console.error("Scheduled agent job failed", agent.id, error);
      }
      result.skipped.push({ agentId: agent.id, reason: message });
      await addAgentLog(agent.id, { kind: "schedule", message: `Scheduled job skipped: ${message}` });
    }
  }
  return result;
}

/**
 * A cheap check pages can run in `after()`: on Vercel's Hobby plan cron
 * fires at most daily, so visits to Agent Studio also nudge the schedule.
 */
export async function tickSchedulesIfDue(): Promise<void> {
  try {
    if (await hasDueAgents()) {
      await runDueAgents();
    }
  } catch (error) {
    console.error("Schedule tick failed", error);
  }
}
