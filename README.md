# WeStride.org

WeStride.org takes an idea from a hunch to a shipped product with AI agents of its own, and lets anyone back it with tokens or compute instead of money. A team of Muse advisors pressure-tests the idea with live, cited research; Muse plans the backlog; Muse Code works the tickets in isolated sandboxes and opens pull requests; standing Muse agents keep the product running after launch. Every step runs on Meta's models, on the member's own key or on a supporter's.

Built in public for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon), October 26 to November 4, 2026, as a Startup-track entry. Licensed under [Apache 2.0](LICENSE).

- Live: [westride.org](https://www.westride.org)
- Demo video: [Watch on YouTube](https://youtu.be/YfN8RQ1bZfs)
- Hackathon write-up: [HACKATHON.MD](HACKATHON.MD) covers exactly what was built during the event, how it uses the Meta Model API and Muse Code, how it maps to the judging rubric, and the case for the Startup track.

## Features

| Studio | What it does |
| -------- | -------------- |
| Idea Workshop | Bring a business, non-profit, game, open-source, website, or mobile app idea. A team of Muse advisors, each with a specialist brief, researches it with web search and cited sources, evaluates it in parallel, and a synthesis step weighs where they agree and disagree. Import any public GitHub repository to start from existing work. |
| Project Factory | Projects, tickets, milestones, and linked GitHub repositories. Muse drafts the backlog and roadmap and ranks the open tickets. Muse Code takes a ticket, works it in a Vercel Sandbox on the member's own account, streams the work log live, and opens a pull request. |
| Agent Studio | Standing Muse agents with their own instructions, backlog, schedule, and usage ledger. With a repository they work tickets as Muse Code; without one they answer with researched reports. |
| WePledge™ | Back an idea without joining its team. Pledge tokens (your Meta key pays for the team's agents up to a cap you set), pledge compute (your computer runs their jobs in an isolated container, optionally on a local model), or follow the team's own capital links. WeStride never collects or holds money. |

Around the studios: free one-to-one Mentorship, an AI Academy, a public REST API with an OpenAPI explorer, an MCP server, Slack, Discord, and WhatsApp bots, and iOS and Android apps.

### Meta models in use

| Model | Where |
| ----- | ----- |
| Muse Spark 1.3 and Muse Wonder 1.0 | Every advisor, evaluation, synthesis, plan, and report job, through the Responses API with structured JSON output and web search |
| Muse Code | Headless in Vercel Sandbox microVMs and in supporters' Docker containers, working tickets and opening pull requests |
| Muse Image 1.0 | Pictures for ideas, projects, and agents; Spark writes the prompt, Image renders it |
| Muse Voice Transcribe 1.0 | Dictation on every long-text field |
| Open-weight models through Ollama | Supporter runners can work code jobs on a local model instead of a Meta key |

Members connect their own Meta account, with the same device sign-in Muse Code uses or by pasting a key, and see what every request cost.

## Built during the hackathon

Every line of WeStride was written by one person, [Garrett Hampton](https://www.linkedin.com/in/garretthampton/), during the hackathon, starting at kickoff on October 26, 2026. The repository's first commit is the initial commit of this project; there is no earlier codebase. The [full history](https://github.com/WeStrideOrg/westride/commits/main) is public. The first commit of each feature:

| Date | Feature | First commit |
| ---- | ------- | ------------ |
| Oct 26 | Repository, Next.js site, Astryx design system, Bun | `878e0d2` |
| Oct 26 | Sign-in with Clerk | `0e7cf5f` |
| Oct 26 | Turborepo monorepo | `713703f` |
| Oct 26 | WeStride stamp and the Meta prompts used to make it | `1951ef4` |
| Oct 26 | Academy data model (tracks and lessons) | `903ee4c` |
| Oct 26 | Terms of service and privacy policy | `48f4ea7` |
| Oct 26 | Design site (Storybook) | `e103e21` |
| Oct 27 | Mobile app (Expo, React Native), iOS and Android builds | `755099f`, `924663d` |
| Oct 27 | Academy tracks, achievements, and mentorship seeds | `babdccb`, `3281e23`, `48aeb1c` |
| Oct 27 | Public REST API and MCP server | `0ef0fb6` |
| Oct 28 | Ideas: create, view, edit | `51262ee`, `566cbbb`, `2b04d8a` |
| Oct 28 | Idea Workshop advisory team on Muse (Responses API, web search, structured output) | `646bfb7` |
| Oct 28 | Feedback form | `b181527` |
| Oct 28 | Achievements, Muse learning challenges, Muse dock, social bonus | `1f58380`, `37256a2` |
| Oct 29 | GitHub connection and repository linking | `d432de8` |
| Oct 29 | Meta account connection (device sign-in and pasted key); Slack, Discord, WhatsApp bots | `90af991` |
| Oct 29 | Profile page | `ec21b5f` |
| Oct 29 | Project Factory: projects, tickets, board, milestones, Muse planning | `dc57dfd` |
| Oct 29 | Muse Code agent runs from a ticket (sandbox, work log, pull request) | `e1abe0b` |
| Oct 29 | Mentor request form | `0c3c9a3` |
| Oct 29 | Game idea path with its advisors | `6bc7d5e` |
| Oct 30 | Open-source idea path with its advisors | `38742fd` |
| Oct 30 | Create a GitHub repository while creating a project | `e616680` |
| Oct 31 | Agent Studio: standing agents, schedules, report and code jobs, usage | `30f8831` |
| Oct 31 | GitHub import and idea claims | `b6f21fc` |
| Nov 1 | Vercel Sandbox on the member's own Vercel account | `c6f0b45` |
| Nov 1 | Muse Image pictures for ideas, projects, and agents | `c5eca0c` |
| Nov 1 | Supporters: token and compute pledges, supporter runner, capital links | `0a1400e` |
| Nov 1 | Muse Voice dictation on every long-text field | `3e9cfaf` |
| Nov 1 | Follow an idea | `8352910` |
| Nov 2 | Apache 2.0 license, hackathon self-assessment, header reorganised around the studios | this change |

## Repository Layout

This repo is a [Turborepo](https://turborepo.com) using Bun workspaces.

| Path | Description |
| ---- | ----------- |
| `apps/web` | WeStride Next.js web app: the studios, WePledge, Academy, Mentorship, settings, and the integration routes (Meta, GitHub, Vercel, Modal, Slack, Discord, WhatsApp, Stripe) |
| `apps/admin` | WeStride Admin, the team's portal: members, studios, pledges, devices, Featured picks, and WeStride Cloud codes. Opens only for Clerk accounts whose public metadata carries `{"role": "admin"}` (see `apps/admin/.env.example`) |
| `apps/api` | Public REST API (Hono, zod-openapi) with the OpenAPI explorer |
| `apps/mcp` | MCP server exposing WeStride to agents and MCP clients |
| `apps/mobile` | iOS and Android app (Expo, React Native) |
| `apps/runner` | Supporter runner: the Docker container a supporter runs to lend compute, working Muse Code jobs on a Meta key or a local Ollama model |
| `apps/design` | Storybook for the WeStride theme and components |
| `packages/db` | Shared Postgres models (Drizzle), migrations, seeds, and the domain rules the apps share |
| `packages/api-client` | Typed client for the public API, used by web, mobile, and the MCP server |
| `packages/runner-protocol` | Message types shared by the web app and the supporter runner |
| `packages/theme` | Astryx theme and tokens |
| `docs` | Design notes for [Project Factory](docs/project-factory.md), [Agent Studio](docs/agent-studio.md), and [WeStride Cloud](docs/westride-cloud.md), plus the prompts used to make the brand assets |

## Getting Started

The fastest way to try WeStride is the live site at [westride.org](https://www.westride.org): sign in, connect your Meta account in Settings (device sign-in or a pasted key from [dev.meta.ai](https://dev.meta.ai/)), and bring an idea to the Idea Workshop. Everything below is for running it yourself.

### Prerequisites

- [Bun](https://bun.sh) 1.4 or newer (the repo's package manager and runtime)
- A Postgres database. [Neon](https://neon.tech) is what the app is built against; any Postgres URL works.
- A [Clerk](https://clerk.com) application for sign-in
- Docker, only if you want to run the supporter runner locally
- A Meta Model API key from [dev.meta.ai](https://dev.meta.ai/). WeStride never calls Muse with a server key; each member connects their own account in the UI, so you will connect yours after signing in.

### 1. Install and configure

```bash
git clone https://github.com/WeStrideOrg/westride.git
cd westride
bun install
cp apps/web/.env.example apps/web/.env       # then fill in values
cp apps/admin/.env.example apps/admin/.env   # same database and Clerk keys as web
```

The only values the web app needs to boot are `DATABASE_URL` and the Clerk keys. Every integration is optional and turns on when its variables are set; `apps/web/.env.example` documents each one, including which features it unlocks:

| To use | Set |
| ------ | --- |
| Connect a Meta account (Idea Workshop, planning, reports, dictation) | `META_TOKEN_ENCRYPTION_KEY` (and optionally `META_DEVICE_CLIENT_ID` for device sign-in) |
| GitHub repositories, imports, and pull requests | `GITHUB_APP_*` and `GITHUB_TOKEN_ENCRYPTION_KEY` |
| Muse Code runs from a ticket | `BUILD_RUNNER_CALLBACK_URL` (a public URL; use a tunnel on localhost) plus `VERCEL_TOKEN_ENCRYPTION_KEY` or `MODAL_TOKEN_ENCRYPTION_KEY` so members can connect a sandbox host |
| Scheduled Agent Studio work | `CRON_SECRET` |
| WeStride Cloud (members without their own accounts) | `WESTRIDE_CLOUD_META_API_KEY`, Modal, and Stripe keys |
| Slack, Discord, WhatsApp bots | The matching `SLACK_*`, `DISCORD_*`, `WHATSAPP_*` values |

### 2. Create the database

```bash
bun run db:migrate   # applies the Drizzle migrations in packages/db
bun run db:seed      # Academy tracks, lessons, and mentorship catalogs
```

`bun run db:reset -- --yes` wipes, migrates, and reseeds in one step.

### 3. Run

```bash
bun run dev          # every app through turbo
```

Or one at a time: `bun run dev:web`, `bun run dev:admin`, `bun run dev:api`, `bun run dev:mcp`, or `bunx turbo run dev --filter=<app>`. The web app listens on port 3000, the admin portal on 3003, and Storybook on 6006. For the mobile app, `cd apps/mobile && bun run start` opens Expo.

Sign in, open Settings, and connect your Meta account. From there the Idea Workshop, Project Factory, and Agent Studio all run on your key, and every request shows what it cost.

### 4. Run a supporter runner (optional)

The runner is how a supporter pledges compute. In the app, open WePledge → Link a computer and copy the command shown; it pairs the machine and starts the container with Docker. To build the image from source instead:

```bash
bun --cwd apps/runner run docker:build
```

The runner works jobs with a Meta key you give it, or with no key at all on a local Ollama model that supports tool calls. See [`apps/runner/README.md`](apps/runner/README.md).

### Tests, lint, and build

```bash
bun test             # unit tests in apps/web/tests and packages/db/tests
bun run lint
bun run build
```

Other root scripts: `bun run start`, `bun run db:generate` (after changing a schema), and the `:production` variants of the `db:*` scripts, which read `apps/web/.env.production`.

## Tech Used

- React
- React Native
- Expo
- Astryx
- Muse
- NodeJS
- TurboRepo
- Neon
- Postgres
- Vercel
- Bun
- TypeScript
- Drizzle

## Thanks

- Lauren Hampton, my wife, for advice on the brand, the colors, and how WeStride should look and feel.
- Jace Whitten, my friend of many years, for advice on the achievement system.
