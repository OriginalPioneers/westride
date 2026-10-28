# WeStride API

[api.westride.org](https://api.westride.org)

Public HTTP API for the WeStride platform, built with Hono on Bun. Response
types live in `@westride/api-client`, which the MCP server and mobile app use
to call it.

## Endpoints

| Method | Path                         | Response                                   |
| ------ | ---------------------------- | ------------------------------------------ |
| GET    | `/health`                    | `{ ok: true }`                             |
| GET    | `/v1/academy/tracks`         | `{ data: AcademyTrack[] }`                 |
| GET    | `/v1/academy/tracks/:slug`   | `{ data: AcademyTrackDetail }` or 404      |

Errors use `{ error: { code, message } }`.

## Local development

```bash
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL
bun run dev:api                          # http://localhost:3001
```
