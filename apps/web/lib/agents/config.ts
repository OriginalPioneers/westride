import "server-only";

/** The path a sandbox posts an agent job's work log to. Listed in proxy.ts. */
export const AGENT_JOB_EVENTS_PATH = "/integrations/agents/events";

/** The path Vercel Cron calls to run due schedules. Listed in proxy.ts. */
export const AGENT_SCHEDULE_PATH = "/integrations/agents/schedule";

/** Active jobs one agent may have at once. */
export const MAX_ACTIVE_JOBS_PER_AGENT = 1;

/** Scheduled agents started per tick, so one slow tick cannot pile up work. */
export const SCHEDULE_BATCH_SIZE = 5;

/** The bearer token Vercel Cron sends; also accepted from any other scheduler. */
export function getCronSecret(): string | null {
  const value = process.env.CRON_SECRET?.trim();
  return value ? value : null;
}
