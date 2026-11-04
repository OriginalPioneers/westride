# Agent Studio

Agent Studio is where a member sets up **standing agents**: a named Muse persona with its own description and instructions, its own backlog of tickets, an optional schedule, and a running account of tokens and spend. An agent can be tied to a project, an idea, both, or neither, and to one GitHub repository. With a repository it works tickets as Muse Code in a sandbox on the member's own Vercel or Modal account and opens pull requests, exactly like Project Factory's **Run with Muse Code**; without one it answers tickets as written reports through the Meta Model API with web search.

The whole feature runs on the member's own accounts: their Meta key pays for the model and their Vercel plan or Modal workspace for the sandbox. Members without those can use WeStride Cloud from a prepaid balance instead (`docs/westride-cloud.md`).

## Setup

Apply the migration with the normal workflow (`bun run db:migrate` from `packages/db`):

- `0018_agent_studio.sql`: `agents`, `agent_tickets`, `agent_jobs`, `agent_job_events`, `agent_log_entries`, their enums, and `muse_requests.agent_id` (so report jobs are also in the Model API request log).

What each part needs:

| Feature | Needs |
| --- | --- |
| Agents, tickets, log, usage pages | Nothing beyond the database. |
| Report jobs | The member's Meta account connected in Settings (`META_TOKEN_ENCRYPTION_KEY` on the server). |
| Code jobs (repository, sandbox, pull request) | The same as Project Factory's runner: the GitHub App (`GITHUB_APP_*`), `BUILD_RUNNER_CALLBACK_URL`, and a sandbox host (`VERCEL_TOKEN_ENCRYPTION_KEY`, `MODAL_TOKEN_ENCRYPTION_KEY`, or WeStride Cloud compute) on the server; the payer's Vercel account (with a team and project chosen) or Modal account connected in Settings, or a WeStride Cloud balance. See `docs/project-factory.md`. |
| Schedules on exact time | `CRON_SECRET` and a scheduler calling `GET /integrations/agents/schedule`. See below. |

`canRunCode(agent)` in `apps/web/lib/agents/start.ts` decides per agent: a repository is linked **and** `isAgentRunnerConfigured()`. Otherwise jobs are reports. A linked repository is kept either way, so configuring the runner later switches the agent to code jobs with no further change.

### Scheduling

Schedules are UTC: `HOURLY` (on the hour), `DAILY` at an hour, or `WEEKLY` on a weekday at an hour. `nextScheduledRunAt` in `packages/db/src/agent-rules.ts` computes the next slot; `agents.next_run_at` stores it.

Two things run due work:

1. **A scheduler.** `apps/web/vercel.json` declares a Vercel Cron job hitting `/integrations/agents/schedule` every 15 minutes. The route requires `Authorization: Bearer $CRON_SECRET` (Vercel sends this automatically when `CRON_SECRET` is set in the project's environment). Any external scheduler can call it the same way. Without `CRON_SECRET` the route answers 401 to everything.
2. **Opportunistic ticks.** Visits to `/agents` and `/agents/[id]` call `tickSchedulesIfDue()` in `after()`, so a server with no scheduler still runs due work when someone is around.

Both go through `runDueAgents()` in `apps/web/lib/agents/schedule.ts`, which claims each due agent atomically (`claimDueAgents` updates `next_run_at` only where it still equals the value it read), so cron and page ticks cannot double-run. A tick starts at most five agents.

Vercel's Hobby plan runs cron jobs at most **once a day** and at an imprecise time; Pro runs them on the declared schedule. On Hobby, hourly agents fire when the daily cron or a page visit catches them. The schedule form says so when `CRON_SECRET` is unset.

A scheduled run picks the agent's highest-priority `BACKLOG` ticket (URGENT → LOW, then queue order). If the backlog is empty and the agent has a **standing task**, the run files a new ticket from it (first line is the title; `source = SCHEDULE`) and works that. With neither, the slot is logged and skipped. Scheduled jobs pay with the **owner's** Meta key and, for code jobs, run on the **owner's** Vercel or Modal account (or their WeStride Cloud balance); a missing connection of either kind is logged on the agent and the slot is skipped.

## Data model

Tables live in `packages/db/src/agent-schema.ts`. Queries: `packages/db/src/agents.ts` (`@westride/db/agents`). Pure rules client components may import: `packages/db/src/agent-rules.ts` (`@westride/db/agent-rules`), which also re-exports the ticket status rules from Project Factory.

- `agents`: name, description, `instructions` (Markdown the agent reads on every job), `status` (ACTIVE, PAUSED, ARCHIVED), `is_public`, `owner_clerk_user_id`, optional `idea_id` and `project_id` (both `set null` on delete), `model`, `max_steps`, the linked repository (`repo_id`, owner, name, URL, default branch, visibility; all nullable), `schedule`, `schedule_hour_utc`, `schedule_weekday`, `standing_task`, `next_run_at`, `last_run_at`, and `next_ticket_number`.
- `agent_tickets`: per-agent `number`, title, description, `status` and `priority` (the Project Factory enums), `sort_order`, `blocked_reason`, `source` (MEMBER or SCHEDULE), creator, `completed_at`. Keys are derived: `agentTicketKey("Release Bot", 3)` → `RB-3`.
- `agent_jobs`: agent, ticket (nullable; a deleted ticket keeps its jobs), `ticket_title` (copied, so the list still reads after deletion), `trigger` (MANUAL or SCHEDULE), `kind` (CODE or REPORT), `status` (the `agent_run_status` enum), who started it and **who paid** (`paid_by_clerk_user_id`), model, step budget, sandbox name, repository, branch, `callback_token_hash`, Muse session id, exit code, head SHA, pull request, `muse_request_id` (reports), summary, error, event count, **usage** (`model_calls`, `input_tokens`, `cached_tokens`, `output_tokens`, `reasoning_tokens`, `total_tokens`, `estimated_cost_micros`), and timestamps.
- `agent_job_events`: job, `sequence` (unique per job), `type` (`setup`, `muse`, `git`, `log`, `finished`), JSON payload. The same shape as `agent_run_events`.
- `agent_log_entries`: the agent's human-readable log: `kind` (`agent`, `ticket`, `job`, `schedule`, `settings`), message, optional ticket, job, and actor.

### Access

- **Owner**: the creator. Changes details, repository, schedule, status; deletes. Their key pays for scheduled jobs.
- **Collaborator**: a member of the linked project or idea. Queues, edits, moves, and deletes tickets; runs jobs on their own key; stops jobs.
- **Visibility**: public agents are readable by anyone; private ones by the owner and members of the linked project or idea. Readers can watch job logs.

`requireAgentCollaborator` and `requireAgentOwner` in `apps/web/lib/agents/access.ts` enforce this in server actions.

### Usage and spend

Every job records tokens and an estimated cost:

- **Code jobs**: the runner script parses Muse Code's `--json` envelope and keeps the last `run.usage` record (cumulative for the run, per model). It sends it in the `finished` event; `usageFromMuseRun` prices each model with `estimateCostMicros` from `apps/web/lib/idea-factory/pricing.ts`. Muse Code before 1.4.11 does not emit `run.usage`; such jobs show zero tokens.
- **Report jobs**: one Model API call, logged to `muse_requests` with `purpose = "agent"` and `agent_id`, and copied onto the job.

`sumAgentUsage`, `sumUsageForPayer`, and the `sumAgentUsageBy{Model,Trigger,Day}` queries feed the cards, the overview, and `/agents/[id]/usage`. Costs are estimates from WeStride's price list; Meta bills the member whose key ran the job.

## Routes

All under `apps/web/app/(main)/agents`. Labels and paths: `apps/web/lib/agents/labels.ts`; validation: `apps/web/lib/agents/schema.ts`.

- `/agents`: agents the viewer can see (yours first), header totals, and the **New agent** dialog (name, description, instructions, visibility, project and idea links, repository, model and step budget, schedule and standing task, a first ticket).
- `/agents/[id]`: overview: description, links, schedule with next and last run and what the next run will work on, ticket counts, recent jobs, usage, log tail, details, standing instructions.
- `/agents/[id]/tickets`, `/agents/[id]/tickets/[number]`: the grouped backlog with a status filter, and the ticket page: **Run now**, status control, edit, delete, the latest job's live log and report, earlier jobs.
- `/agents/[id]/jobs`, `/agents/[id]/jobs/[jobId]`: every job with trigger, kind, status, tokens, cost, and pull request; the job page with the full log and a usage breakdown.
- `/agents/[id]/log`: the agent's log.
- `/agents/[id]/usage`: totals, by model, by trigger, last 30 days.
- `/agents/[id]/settings` (owners): schedule, repository, details, and status (pause, resume, archive, delete).

Project overview pages and idea pages list the agents linked to them.

### Integration routes

- `POST /integrations/agents/events`: the sandbox runner posts work-log batches with the job's bearer token, like `/integrations/muse-code/events`. A `finished` event closes the job through `completeCodeJob` (pull request, ticket move, usage, log, sandbox stop).
- `GET /integrations/agents/schedule`: runs due agents; see Scheduling.

Both are listed in `SIGNED_WEBHOOKS` in `apps/web/proxy.ts` so the crawler filter and Clerk let them through.

## Job lifecycle

**Code job** (`startAgentJob` → `startCodeJob` in `apps/web/lib/agents/start.ts`): checks the agent is ACTIVE, the payer has a Meta key, the ticket has no active job and the agent is under its concurrency cap (one job at a time); requires the payer's Vercel sandbox credentials (`getVercelSandboxCredentials`); verifies the payer can push to the repository and mints a repository-scoped installation token; creates the job with a hashed per-job token; writes the prompt (`buildCodeJobPrompt`: ticket, agent persona and instructions, linked project and idea, how to work, report format); launches the sandbox detached on the payer's Vercel team and project with the shared `RUNNER_SCRIPT`; moves the ticket to IN_PROGRESS. Completion goes through the events route. Success with a push → pull request, ticket to IN_REVIEW; success without changes → ticket back to BACKLOG; failure → ticket BLOCKED with the error as the reason.

**Report job** (`startReportJob`): creates the job RUNNING and returns a `work` closure. The server action runs it in `after()` so the page returns at once; the cron route awaits it. `work` calls `callMuse` with web search, logs the request, writes two events (the answer as `run.terminal.completed`, then `finished`), copies usage onto the job, and moves the ticket to IN_REVIEW (or BLOCKED on failure). Reports that never settle are closed as failed after ten minutes by `reconcileStaleJob`.

The shared runner script (`apps/web/lib/build/agent/runner-script.ts`) now reads Muse Code's `--json` envelope properly: session id from the `session` stream, the final message from `run.terminal.*` or accumulated `run.output.delta`, and usage from `run.usage`. Project Factory runs get the better session and summary detection for free; their `run.usage` record shows in the work log but is not stored on `agent_runs`.

## Tests

`packages/db/tests/agent-rules.test.ts` covers ticket keys, schedule arithmetic (hourly, daily, weekly, including the skip-a-week case), schedule descriptions, and usage totals. Run with `bun test packages/db/tests/agent-rules.test.ts`.
