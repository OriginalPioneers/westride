# Build Studio

Build Studio is where an idea from the Idea Studio becomes software. A member creates a **project**, optionally linked to an idea, links one or more GitHub repositories, and tracks the work as **tickets**. Later phases let Muse draft the backlog and roadmap, and let a Muse Code agent complete a ticket without the member running Muse Code locally.

This document records the data model, the delivered Phase 1 surface, and the plan for the remaining phases.

## Setup

Apply `packages/db/migrations/0013_build_studio.sql` with the normal migration workflow (`bun run db:migrate` from `packages/db`). It adds the `projects`, `project_members`, `project_repos`, `project_milestones`, and `tickets` tables plus their enums. No existing table is altered.

Public repositories link without any GitHub connection. Private repositories require the member's GitHub connection from Settings, exactly as idea repositories do (`findReadableRepo`). No new environment variables are needed for Phase 1.

## Data model

All build tables live in `packages/db/src/build-schema.ts`; queries live in `packages/db/src/build.ts` (exported as `@westride/db/build`); pure rules that client components may import live in `packages/db/src/build-rules.ts` (`@westride/db/build-rules`).

- `projects`: name, description (Markdown), `status` (PLANNING, BUILDING, LAUNCHED, PAUSED), `is_public`, optional `idea_id` (set null on idea delete), and `next_ticket_number`, a per-project counter that is incremented atomically when a ticket is created.
- `project_members`: `(project_id, clerk_user_id)` with role OWNER or MEMBER. Membership is separate from idea membership; it is seeded from the idea's members when a project is created from an idea, and can diverge afterwards. Every project keeps at least one owner.
- `project_repos`: linked GitHub repositories (`repo_id`, owner, name, URL, default branch, visibility). Exactly one is `is_primary`; the first linked repository becomes primary and unlinking it promotes the next. The primary repository is where Muse Code agents work unless a ticket picks another.
- `project_milestones`: ordered roadmap entries with status PLANNED, ACTIVE, COMPLETED and an optional `target_date` (`YYYY-MM-DD` text).
- `tickets`: per-project `number` (unique with `project_id`), title, description (Markdown), `status`, `priority` (LOW, MEDIUM, HIGH, URGENT), `sort_order`, optional milestone, repository, and assignee, `blocked_reason`, `source` (MEMBER or MUSE), `muse_request_id`, `created_by_clerk_user_id`, and `completed_at`.

Ticket statuses are `BACKLOG`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `DONE`. The UI labels `BLOCKED` as "Roadblocked". `ticketStatusChange` in `build-rules.ts` enforces that moving to BLOCKED needs a reason, clears the reason when leaving BLOCKED, stamps `completed_at` on DONE and clears it when a ticket is reopened.

Ticket keys shown in the UI are derived, not stored: `ticketKey(projectName, number)` uses the project's initials (up to four, e.g. "Grow Together" → `GT-1`) or the first word's stem for single-word names.

Visibility: private projects are readable by members only; public projects are readable by anyone, writable by members only. Owners additionally manage name, description, visibility, stage, and the team.

## Phase 1 (delivered): projects, tickets, repositories

Routes under `apps/web/app/(main)/build`:

- `/build`: lists projects the viewer can see, split into "Your projects" and "Other projects", with a New project dialog. The dialog can start from an idea (`loadProjectPrefill` copies name, pitch, repository, and team; idea founders become owners), accepts several repository URLs, and invites members with a role.
- `/build/[id]`: overview with description, linked idea, per-status progress, roadmap, linked code, and team.
- `/build/[id]/tickets` and `/build/[id]/tickets/[number]`: list grouped by status (filterable via `?status=`), and a detail page with status control, edit, delete, roadblock banner, and metadata. New tickets are created from either page and land at the top of the Backlog.
- `/build/[id]/settings`: repositories (link, unlink, set primary), milestones, and for owners the project details and team form.

The idea page gained a **Build this idea** button that opens the same dialog pre-filled, and a Build Studio section listing projects linked to the idea.

Server actions live in `apps/web/app/(main)/build/actions.ts`; validation schemas in `apps/web/lib/build/schema.ts`; labels and paths in `apps/web/lib/build/labels.ts`.

## Phase 2: Muse planning

Muse drafts a backlog, roadmap, and priorities from the project description, linked idea, and (read-only) repository tree. Uses the existing `callMuse` Meta Model API client with JSON schema outputs and the member's own key via `getMuseApiKey`; WeStride never calls Muse with its own key for member work. Drafted tickets are inserted with `source = MUSE` and `muse_request_id` set, so members can see what Muse proposed and edit before committing. Needs `muse_requests.idea_id` to become nullable and a `project_id` column added.

## Phase 3: GitHub activity

Show commits, pull requests, branches, merges, and deployments per linked repository on the project overview. Read through the GitHub App installation token (`installationToken`), cached per repository; subscribe to the App's `push`, `pull_request`, and `deployment_status` webhooks to refresh. Pull requests opened by agent runs link back to their ticket.

## Phase 4: Muse Code agent runs

A member can hand a ticket to a Muse Code agent without running Muse Code locally.

Runner design:

- A **Vercel Sandbox** is started per run. It receives the member's Meta API key (as an environment variable, decrypted only for the run) and a short-lived, repository-scoped GitHub installation token. The sandbox clones the ticket's repository (or the primary one), creates a branch named after the ticket key, and runs Muse Code headless.
- Muse Code's non-interactive mode (<https://dev.meta.ai/docs/muse-code/extending>): `muse exec "<prompt>"` or `muse exec --prompt-file <file>`, with `--json` for JSONL events, `--disable-approval` (or `--yolo`) to run unattended, `--max-model-steps <n>` as a cost ceiling, and `--session-id <id>` to resume. `muse export --session <id>` dumps the transcript. Exit codes: `0` completed, `1` failed or cancelled, `2` usage error, `130`/`143` signals. The Linux sandbox requires bubblewrap; the sandbox image must include it.
- The runner script streams every JSONL event to a WeStride API route (`POST /api/build/runs/[id]/events`, authenticated with a per-run token) so the ticket page shows a live work log. On exit it pushes the branch, opens a pull request as `westride[bot]`, posts the summary, and moves the ticket to IN_REVIEW; on failure it records the exit code and the last events and moves the ticket to BLOCKED with the reason.
- New tables `agent_runs` (ticket, repo, sandbox id, status, started/finished, exit code, PR URL, step and token counts) and `agent_run_events` (run, sequence, type, payload). `tickets.repo_id`, `tickets.source`, and `tickets.muse_request_id` already exist so no ticket-table change is needed.

Budget: one running agent per ticket, a per-project concurrent-run cap, `--max-model-steps` default from project settings, and a hard sandbox timeout.

## Phase 5: Polish

Kanban view with drag between statuses, ticket comments, notifications when an agent finishes or is blocked, and public project pages that showcase progress.

## Checks

From the repository root: `bun test packages/db/tests/build-rules.test.ts`, `bunx tsc --noEmit -p apps/web`, and `bun run lint`. From `apps/web`: `npx @astryxdesign/cli@0.7.4 doctor --built "app/(main)/build"`. The two `theme-*` doctor failures are pre-existing repository-wide theme checks, not Build Studio findings.
