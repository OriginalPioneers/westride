# WeStride.org

WeStride.org is a platform for learning AI, mentorship and entrepreneurship.

## Features

| Module | Capabilities |
| -------- | -------------- |
| WeStride Academy | AI fundamentals, prompting, agents, coding, entrepreneurship, structured learning paths |
| Achievements | Badges, XP, certifications, learning streaks, portfolio accomplishments |
| Mentorship | Mentor discovery, matching, availability, messaging, office hours |
| Idea Studio | Business and nonprofit idea creation, validation, research, market analysis |
| Muse AI Assistant | AI-powered business planning, customer discovery, drafting, research, competitive analysis |
| Build Studio | Generate applications, websites, prototypes, and MVPs through AI coding tools |
| Community | Share progress, collaborate on ideas, form teams, participate in challenges |

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
