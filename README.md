# WeStride.org

WeStride.org takes an idea from a hunch to a shipped product with AI agents of its own, and lets anyone back it with tokens or compute instead of money. A team of Muse advisors pressure-tests the idea with live, cited research; Muse plans the backlog; Muse Code works the tickets in isolated sandboxes and opens pull requests; standing Muse agents keep the product running after launch. Every step runs on Meta's models, on the member's own key or on a supporter's.

Built in public for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon), October 26 to November 4, 2026. Licensed under [Apache 2.0](LICENSE).

## Features

| Studio | What it does |
| -------- | -------------- |
| Idea Studio | Bring a business, non-profit, game, or open-source idea. A team of Muse advisors, each with a specialist brief, researches it with web search and cited sources, evaluates it in parallel, and a synthesis step weighs where they agree and disagree. Import any public GitHub repository to start from existing work. |
| Build Studio | Projects, tickets, milestones, and linked GitHub repositories. Muse drafts the backlog and roadmap and ranks the open tickets. Muse Code takes a ticket, works it in a Vercel Sandbox on the member's own account, streams the work log live, and opens a pull request. |
| Agent Studio | Standing Muse agents with their own instructions, backlog, schedule, and usage ledger. With a repository they work tickets as Muse Code; without one they answer with researched reports. |
| Supporting | Back an idea without joining its team. Pledge tokens (your Meta key pays for the team's agents up to a cap you set), pledge compute (your computer runs their jobs in an isolated container, optionally on a local model), or follow the team's own capital links. WeStride never collects or holds money. |

Around the studios: free one-to-one Mentorship, an Academy with Muse feedback on challenges, a public REST API with an OpenAPI explorer, an MCP server, Slack, Discord, and WhatsApp bots, and iOS and Android apps.

### Meta models in use

| Model | Where |
| ----- | ----- |
| Muse Spark 1.3 and Muse Wonder 1.0 | Every advisor, evaluation, synthesis, plan, report job, and companion reply, through the Responses API with structured JSON output and web search |
| Muse Code | Headless in Vercel Sandbox microVMs and in supporters' Docker containers, working tickets and opening pull requests |
| Muse Image 1.0 | Pictures for ideas, projects, and agents; Spark writes the prompt, Image renders it |
| Muse Voice Transcribe 1.0 | Dictation on every long-text field |
| Open-weight models through Ollama | Supporter runners can work code jobs on a local model instead of a Meta key |

Members connect their own Meta account, with the same device sign-in Muse Code uses or by pasting a key, and see what every request cost.

## Built during the hackathon

Every line of WeStride was written during the hackathon, starting at kickoff on October 26, 2026. The repository's first commit is the initial commit of this project; there is no earlier codebase. The [full history](https://github.com/OriginalPioneers/westride/commits/main) is public. The first commit of each feature:

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
| Oct 28 | Idea Studio advisory team on Muse (Responses API, web search, structured output) | `646bfb7` |
| Oct 28 | Feedback form | `b181527` |
| Oct 28 | Achievements, Muse learning challenges, Muse dock, social bonus | `828a2fa`, `4c66e42` |
| Oct 29 | GitHub connection and repository linking | `9f955d6` |
| Oct 29 | Meta account connection (device sign-in and pasted key); Slack, Discord, WhatsApp bots | `f0fc8cb` |
| Oct 29 | Profile page | `4593512` |
| Oct 29 | Build Studio: projects, tickets, board, milestones, Muse planning | `8833574` |
| Oct 29 | Muse Code agent runs from a ticket (sandbox, work log, pull request) | `27fb74b` |
| Oct 29 | Mentor request form | `89ca124` |
| Oct 29 | Game idea path with its advisors | `dbeaede` |
| Oct 30 | Open-source idea path with its advisors | `ab86068` |
| Oct 30 | Create a GitHub repository while creating a project | `2cbb869` |
| Oct 31 | Agent Studio: standing agents, schedules, report and code jobs, usage | `80789fe` |
| Oct 31 | GitHub import and idea claims | `659474c` |
| Nov 1 | Vercel Sandbox on the member's own Vercel account | `70e2c0c` |
| Nov 1 | Muse Image pictures for ideas, projects, and agents | `a2fd7fe` |
| Nov 1 | Supporters: token and compute pledges, supporter runner, capital links | `b233d7e` |
| Nov 1 | Muse Voice dictation on every long-text field | `aa96982` |
| Nov 1 | Follow an idea | `506fa23` |
| Nov 2 | Apache 2.0 license, hackathon self-assessment, header reorganised around the studios | this change |

## Repository Layout

This repo is a [Turborepo](https://turborepo.com) using Bun workspaces.

| Path | Description |
| ---- | ----------- |
| `apps/web` | WeStride Next.js web app |
| `packages/db` | Shared Postgres models (Drizzle) and migrations |

## Development

```bash
bun install
cp apps/web/.env.example apps/web/.env   # then fill in values
bun run dev                              # runs all apps via turbo
```

Other root scripts: `bun run build`, `bun run lint`, `bun run start`, `bun run db:generate`, `bun run db:migrate`. To target a single app, use `bunx turbo run dev --filter=web`.

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
