# Project Factory

Project Factory is where an idea from the Idea Workshop becomes software. A member creates a **project**, optionally linked to an idea, links one or more GitHub repositories, and tracks the work as **tickets**. Muse drafts the backlog and roadmap and ranks the work; a Muse Code agent can take a ticket and open a pull request, without the member running Muse Code locally; and the project shows what is happening in its repositories.

This document records the setup, the data model, and every delivered surface.

## Setup

Apply the migrations with the normal workflow (`bun run db:migrate` from `packages/db`):

- `0013_build_studio.sql`: `projects`, `project_members`, `project_repos`, `project_milestones`, `tickets`, and their enums.
- `0014_build_studio_agents.sql`: `ticket_comments`, `agent_runs`, `agent_run_events`; makes `muse_requests.idea_id` nullable and adds `muse_requests.project_id` so planning requests are logged against a project.
- `0020_vercel_connections.sql`: `vercel_connections`, the member's Vercel account that hosts their sandboxes.
- `0026_modal_connections.sql`: `modal_connections`, the member's own Modal account as the other sandbox host, and `compute_source` on runs and jobs. See `docs/westride-cloud.md`.
- `0029_build_compute_targets.sql`: the `compute_target` enum and, on `agent_runs`, `compute_target`, `device_id`, `lease_expires_at`, `prompt`, `local_model`, `pledge_id`, so a ticket run can go to a linked computer; `pledge_contributions.run_id` so a sponsor's computer is credited for it. Existing WeStride Cloud runs are backfilled to `WESTRIDE_CLOUD`; everything else reads `THIRD_PARTY`.

What each feature needs:

| Feature | Needs |
| --- | --- |
| Projects, tickets, board, comments | Nothing beyond the database. |
| Private repositories, GitHub activity for private repos | The member's GitHub connection (Settings), as for ideas. |
| Plan with Muse | The member's Meta account connected in Settings (`META_TOKEN_ENCRYPTION_KEY` on the server). WeStride never calls Muse with its own key for member work. |
| Run with Muse Code | On the server: the GitHub App (`GITHUB_APP_*`) and `BUILD_RUNNER_CALLBACK_URL`, plus at least one place to run: a sandbox host (`VERCEL_TOKEN_ENCRYPTION_KEY`, `MODAL_TOKEN_ENCRYPTION_KEY`, or WeStride Cloud compute) or linked computers running the supporter runner (`apps/runner/README.md`). For the member: GitHub connected, and whatever the chosen compute target needs (below). |

### Where a run can go

The run dialog asks where the compute runs. The choice is stored on the run as `compute_target` and shown in the work log and on the Agent runs page. Shared constants live in `apps/web/lib/build/compute-target.ts`; `apps/web/lib/build/compute-availability.ts` works out, per member and project, which targets are ready right now and why the others are not, and the dialog disables those with the reason.

| Target | Where | Model | Needs |
| --- | --- | --- | --- |
| **WeStride Cloud** | A Modal sandbox on WeStride's account | WeStride's Meta key | A WeStride Cloud balance of at least `MIN_BALANCE_FOR_COMPUTE_MICROS` ($0.50). Charged per `docs/westride-cloud.md`. |
| **Local** | The member's own computer, running the supporter runner in Docker | Muse models through the `META_API_KEY` set on that runner (Ollama models only when the runner opts in with `WESTRIDE_OFFER_OLLAMA_MODELS=1`; the bundled Muse Code cannot use them yet, see `apps/runner/README.md`) | A computer linked from WePledge™ and online. Nothing is charged by WeStride. |
| **Sponsors** | A supporter's computer with an active compute pledge to the project's idea | The supporter's Ollama models or Meta key | The project linked to an idea, a sponsor's computer online, and a **public** repository. The run is credited to the pledge. |
| **3rd party** | A Vercel or Modal sandbox on the member's own account | The member's Meta key | Vercel or Modal and Meta connected in Settings. |

The default is WeStride Cloud when the member's cloud preference says so and the balance allows, otherwise the first ready target in the order 3rd party, WeStride Cloud, Local, Sponsors.

Local and Sponsors runs do not use a sandbox. `startAgentRun` queues the run with `runner_kind = VOLUNTEER_DEVICE` and the eligible computer leases it through the same protocol Agent Studio jobs use (`apps/web/lib/runner/lease.ts`, `packages/runner-protocol`): the runner long-polls `/integrations/runner/lease`, `leaseForDevice` tries an Agent Studio job first and then `leaseBuildRun`, which hands over the clone URL, base branch, prompt, model, and a run token minted at lease time; the runner posts its work log to `/integrations/muse-code/events` and the changed files to `/integrations/runner/result`, and WeStride commits them to the branch (`completeDeviceRun`) and opens the pull request. Heartbeats extend `lease_expires_at`; `reconcileStaleRun` fails a run no computer picked up within `VOLUNTEER_QUEUE_TIMEOUT_MS`, or whose lease expired. Local runs go only to computers owned by the member who started the run; Sponsors runs only to computers of supporters with an active COMPUTE pledge to the idea.

Runners post their work log to the WeStride they are paired with, keeping only the path from `eventsUrl`, so a development server works without a tunnel for Local runs; sandboxes still need `BUILD_RUNNER_CALLBACK_URL` to be a publicly reachable origin (no path; a path is dropped).

Credentials never leave WeStride for a sponsor's computer: the repository must be public and is cloned anonymously. For a **Local** run on a private repository, the member's own computer receives a short-lived installation token limited to that one repository with `contents: read` and `metadata: read`, embedded in the clone URL; pushing and the pull request are still done by WeStride.

### Agent runner environment

Muse Code agents run in [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) microVMs or [Modal Sandboxes](https://modal.com/docs/guide/sandboxes) on the **member's own account**, so Vercel or Modal bills the member for sandbox time; members with neither can use WeStride Cloud (`docs/westride-cloud.md`). The server needs:

- `BUILD_RUNNER_CALLBACK_URL`: the public origin of this WeStride server, e.g. `https://westride.org`. The sandbox posts its work log here; it cannot reach `localhost`, so local development needs a tunnel URL.
- `VERCEL_TOKEN_ENCRYPTION_KEY` and/or `MODAL_TOKEN_ENCRYPTION_KEY`: 32 random bytes, base64, each. Members' Vercel and Modal tokens are kept AES-256-GCM encrypted with them (`apps/web/lib/sealed-secret.ts`), the same way as Meta keys. Either key alone is enough to offer that host.
- Optional: `VERCEL_DEVICE_CLIENT_ID` turns on **Sign in with Vercel** (the OAuth device flow Vercel's CLI and Sandbox SDK use). Without it, members paste an access token from their Vercel account settings.
- Optional tuning: `BUILD_RUNNER_SANDBOX_TIMEOUT_MINUTES` (default 45, max 300), `BUILD_RUNNER_SANDBOX_VCPUS` (default 2), `BUILD_RUNNER_MAX_ACTIVE_RUNS` (default 2 per project).

`isAgentRunnerConfigured()` in `apps/web/lib/build/agent/config.ts` gates the UI: without these, the **Run with Muse Code** button is disabled with a note, and everything else in Project Factory still works.

### The member's Vercel connection

Code in `apps/web/lib/vercel/`:

- `api.ts`: the slice of Vercel's REST API that connecting needs (`/v2/user`, `/v2/teams`, `/v10/projects`, `POST /v11/projects`) and the device sign-in against `vercel.com/.well-known/openid-configuration` (start, poll, refresh, revoke).
- `connection.ts`: `saveVercelAccount` / `saveVercelAccessToken` (verify the token with `/v2/user`, store it encrypted), `setVercelScope`, `getVercelAccessToken` (renews a device sign-in token from its refresh token a few minutes before expiry; a rejected refresh deletes the connection), `getVercelSandboxCredentials` (the `{ token, teamId, projectId }` the Sandbox SDK takes; null until the member has connected **and** picked a team and project), `disconnectVercelAccount`.

Settings (`apps/web/app/(main)/settings/vercel-settings.tsx`, actions in `apps/web/app/(main)/vercel-actions.ts`) walks the member through it: connect (sign in or paste a token), then choose the team that pays and the project the sandboxes are created under. The project picker lists the team's projects and offers to create an empty `westride-muse-code` project; a team with no projects gets one created. The choice can be changed later. `vercel_connections` holds the kind (`VERCEL_ACCOUNT` or `ACCESS_TOKEN`), Vercel user id and username, the encrypted tokens, and the team and project (id, slug, name).

A run started by a member without a scoped Vercel connection fails before anything is created with `needsConnection = "vercel"`, and the run dialog shows a banner pointing at Settings. If Vercel refuses the sandbox itself (401/403, e.g. the team has no Sandbox access), the run is marked FAILED and the same banner says so.

## Data model

All build tables live in `packages/db/src/build-schema.ts`. Queries: `packages/db/src/build.ts` (`@westride/db/build`) for projects, tickets, milestones, and `packages/db/src/build-agents.ts` (`@westride/db/build-agents`) for comments, runs, and run events. Pure rules client components may import: `packages/db/src/build-rules.ts` (`@westride/db/build-rules`).

- `projects`: name, description (Markdown), `status` (PLANNING, BUILDING, LAUNCHED, PAUSED), `is_public`, optional `idea_id`, and `next_ticket_number`, a per-project counter incremented atomically on ticket creation.
- `project_members`: `(project_id, clerk_user_id)` with role OWNER or MEMBER. Separate from idea membership; seeded from the idea when a project is created from one. Every project keeps at least one owner.
- `project_repos`: linked GitHub repositories (`repo_id`, owner, name, URL, default branch, visibility). Exactly one is `is_primary`; agents work there unless a ticket picks another.
- `project_milestones`: roadmap entries with status PLANNED, ACTIVE, COMPLETED and optional `target_date` (`YYYY-MM-DD`).
- `tickets`: per-project `number`, title, description (Markdown), `status`, `priority`, `sort_order`, optional milestone, repository, assignee, `blocked_reason`, `source` (MEMBER or MUSE), `muse_request_id`, creator, `completed_at`.
- `ticket_comments`: ticket, optional `author_clerk_user_id` (null for comments an agent run leaves), optional `agent_run_id`, Markdown body.
- `agent_runs`: project, ticket, repository, who started it, `status` (QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED), `compute_target` (WESTRIDE_CLOUD, LOCAL, SPONSORS, THIRD_PARTY), sandbox name, branch and base branch, model, `max_steps`, `callback_token_hash` (SHA-256 of the per-run bearer token; the token itself is never stored), Muse session id, exit code, head SHA, pull request number and URL, summary, error, event count, and timestamps. Runs on a linked computer also carry `device_id`, `lease_expires_at`, the `prompt` (handed over at lease time), `local_model` (the Ollama tag, when not a Muse model), and `pledge_id` for Sponsors runs.
- `agent_run_events`: run, `sequence` (unique per run, so a retried delivery never duplicates a line), `type` (`setup`, `muse`, `git`, `log`, `finished`), JSON payload.

Ticket statuses are `BACKLOG`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `DONE`; the UI labels `BLOCKED` as "Roadblocked". `ticketStatusChange` enforces that BLOCKED needs a reason, clears it on leaving, and stamps or clears `completed_at`. Ticket keys are derived: `ticketKey(projectName, number)` uses the project's initials ("Grow Together" → `GT-1`).

Visibility: private projects are readable by members only; public projects are readable by anyone, writable by members only. Owners also manage details, visibility, stage, and the team.

## Routes

All under `apps/web/app/(main)/build`. Shared access checks (`requireProjectMember`, `requireProjectOwner`, `Failure`) live in `apps/web/lib/build/access.ts`; validation schemas in `apps/web/lib/build/schema.ts`; labels and paths in `apps/web/lib/build/labels.ts`.

- `/build`: projects the viewer can see, plus the New project dialog (start from an idea, link repositories, invite members).
- `/build/[id]`: overview with description, linked idea, progress, roadmap, code, team. Members get **Plan with Muse** and **New ticket**.
- `/build/[id]/board`: one column per status. The card menu reorders within a column or moves to another status (moving to Roadblocked asks for the reason). Moves are optimistic and go through `reorderTicketAction` → `reorderTicket`, which renumbers the target column.
- `/build/[id]/tickets`, `/build/[id]/tickets/[number]`: grouped list with a status filter, and the ticket page: status control, edit, delete, **Run with Muse Code**, the latest run's live work log and report, and comments.
- `/build/[id]/activity`: live GitHub activity per linked repository (below).
- `/build/[id]/runs`: every agent run for the project with status, branch, model, starter, pull request.
- `/build/[id]/settings`: repositories, milestones, and for owners the details and team form.

The idea page has a **Build this idea** button and lists the idea's projects.

## Plan with Muse

`apps/web/lib/build/planning.ts` holds the prompts and JSON schemas; `apps/web/app/(main)/build/planning-actions.ts` the server actions. Two modes:

- **Draft a backlog**: Muse reads the project description, the linked idea's pitch, the primary repository's README (with the viewer's own GitHub access), the existing milestones and tickets, and the member's notes, and returns milestones and tickets (each ticket's description is written as a brief an agent can act on). The member reviews the draft with checkboxes and adds what they keep. Milestones match existing ones by title; tickets land at the top of the Backlog with `source = MUSE` and `muse_request_id` set, and are assigned to the primary repository.
- **Prioritise open tickets**: Muse ranks the open tickets with a priority and a one-line reason. Accepting applies the priorities and the backlog order via `applyTicketRanking`. Tickets Muse skipped are kept in place.

Every call uses the member's own key (`getMuseApiKey`) and is logged to `muse_requests` with `purpose = "plan"` and `project_id` set. Nothing is written to the board until the member accepts.

## GitHub activity

`apps/web/lib/build/activity.ts` reads, per linked repository and with the viewer's access via `findReadableRepo`: the last 25 commits, the 25 most recently updated pull requests (open, merged, closed), up to 60 branches, and the last 10 deployments with their latest status. Pull request titles and branch names are scanned for ticket keys (`GT-12`) so they link to the ticket; agent branches are `westride/<key>-<slug>-<suffix>` and match the same way. Nothing is stored; a repository the viewer cannot read shows a note instead. There are no webhooks: the page reads live on each load (`force-dynamic`).

## Muse Code agent runs

Code in `apps/web/lib/build/agent/`:

- `config.ts`: environment, `isAgentRunnerConfigured()` (sandboxes), `isVolunteerRunnerConfigured()` (linked computers), and `isBuildRunnerConfigured()` (either).
- `token.ts`: per-run bearer token (random, stored hashed, compared in constant time).
- `prompt.ts`: the brief (`buildAgentPrompt`) and branch name (`agentBranchName`).
- `runner-script.ts`: the Node script that runs inside the sandbox.
- `start.ts`: `startAgentRun`.
- `finish.ts`: `completeAgentRun`, `cancelAgentRun`, `reconcileStaleRun`.
- `snapshot.ts`: the browser-safe shape of a run and its log, and `describeRunEvent` for the work log view.

What happens on **Run with Muse Code**:

1. `startRunAction` (`run-actions.ts`) checks the member may edit the project, that the ticket is not done, and picks the repository (chosen → ticket's → primary). It passes the chosen `computeTarget` and, for Local and Sponsors, the `localModel`.
2. `startAgentRun` resolves the placement for the target (`resolveSandboxAccessFor` and `resolveMuseAccessFor` for the sandbox targets; an online eligible computer for the device targets), requires a GitHub connection with push rights to the repository (the same rule as committing from WeStride), allows one active run per ticket and `BUILD_RUNNER_MAX_ACTIVE_RUNS` per project, and for sandbox targets mints an installation token scoped to that one repository with `contents: write`, `pull_requests: write`, `metadata: read`. A refusal is an `AgentStartError` whose `needsConnection` (`meta`, `github`, `compute`, `cloud`, `device`) picks the banner the dialog shows.
3. For a sandbox target it records the run, then creates a non-persistent sandbox (on the member's Vercel team and project, their Modal workspace, or WeStride's Modal account) that clones the repository at its default branch (`x-access-token` + the installation token), writes the runner and the prompt under `/tmp/westride/`, and starts the runner detached. For a device target it records the run as QUEUED with `runner_kind = VOLUNTEER_DEVICE` and waits for the computer to lease it (see "Where a run can go"). Either way the ticket moves to IN_PROGRESS and gets a comment.
4. The runner installs Muse Code (`curl -fsSL https://dev.meta.ai/install.sh | sh` into `/tmp/westride/bin`), creates the branch, and runs `muse exec --json --yolo --no-session-log --max-model-steps <n> --model <model> --contributor-mode <on|off> --prompt-file …` with `META_API_KEY` set. `--yolo` is appropriate because the sandbox is a disposable microVM that holds nothing but this checkout. Every JSONL line is forwarded as a `muse` event; non-JSON output and stderr become `log` events; events are batched and posted with retries to `POST /integrations/muse-code/events` with the run token.
5. After Muse exits, the runner commits anything left in the working tree, and if the branch is ahead of the base, pushes it with the installation token. It then sends a `finished` event with the exit code, head SHA, whether it pushed, the Muse session id, and the agent's final message.
6. The events route verifies the token, appends the batch (idempotent on `sequence`), and on `finished` runs `completeAgentRun` after the response: opens the pull request as the WeStride app (title `<key>: <ticket title>`, body = the agent's report), marks the run SUCCEEDED or FAILED, posts a comment with the report, moves the ticket to IN_REVIEW (pull request opened), back to BACKLOG (finished with no changes), or to BLOCKED with the error, and stops the sandbox.

Other behaviour:

- **Stop** on the ticket page cancels: the run is marked CANCELLED, the ticket returns to BACKLOG if it was IN_PROGRESS, and the sandbox is stopped. The route then answers the runner with `410`, and the runner stops posting.
- Stopping uses the Vercel credentials of the member who started the run (`agent_runs.started_by_clerk_user_id`; `agent_jobs.paid_by_clerk_user_id` for Agent Studio). If they have disconnected Vercel since, the stop is skipped with a warning and the sandbox ends at its timeout.
- A sandbox that hits Vercel's timeout never reports back. `reconcileStaleRun` closes any run still active more than five minutes past the timeout as FAILED; it runs whenever a run is read.
- Runs on a linked computer finish through `/integrations/runner/result` rather than a `finished` event: `completeDeviceRun` commits the returned files to the branch as WeStride, then `completeAgentRun` opens the pull request and, for Sponsors runs, records a `pledge_contributions` row against the pledge. Stop clears the computer's current job so it can take the next one; the runner learns of the cancel on its next heartbeat (`410`).
- `proxy.ts` lists `/integrations/muse-code/events` with the other signed webhooks so the user-agent filter lets the runner through; the bearer token is the whole authentication.
- The work log view polls `readRunAction` every three seconds while a run is active and refreshes the page when it ends.

Muse Code's JSONL event shape is Muse's own and not documented in detail; `describeRunEvent` reads the common fields (`type`, `text`, `content`, `tool`, `arguments`) and falls back to the event type. If the format changes, only that function and the runner's `findAssistantText` need adjusting.

## Not included

- Push notifications when an agent finishes: the repository has no notification system. Run outcomes are posted as ticket comments and appear on the Agent runs page.
- Drag-and-drop on the board: cards move through a menu. The Astryx kanban template depends on a StyleX compiler the app does not have.
- GitHub webhooks: activity is read live instead.

## Checks

From the repository root: `bun test packages/db/tests/build-rules.test.ts`, `bunx tsc --noEmit -p apps/web`, and `bun run lint`. From `apps/web`: `npx @astryxdesign/cli@0.7.4 doctor --built "app/(main)/build"`. The two `theme-*` doctor findings are pre-existing repository-wide theme checks, not Project Factory findings.

The agent runner cannot be exercised without a member's connected Vercel account and a public callback URL; the rest of Project Factory is covered by the checks above and a browser smoke test.
