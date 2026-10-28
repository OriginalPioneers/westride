# WeStride API

[api.westride.org](https://api.westride.org) · [Reference](https://api.westride.org/docs) · [OpenAPI spec](https://api.westride.org/openapi.json)

Public HTTP API for the WeStride platform, built with Hono on Bun. Response
types live in `@westride/api-client`, which the MCP server and mobile app use
to call it.

## Endpoints

| Method | Path                         | Response                                   |
| ------ | ---------------------------- | ------------------------------------------ |
| GET    | `/health`                    | `{ ok: true }`                             |
| GET    | `/v1/academy/tracks`         | `{ data: AcademyTrack[] }`                 |
| GET    | `/v1/academy/tracks/:slug`   | `{ data: AcademyTrackDetail }` or 404      |
| GET    | `/openapi.json`              | OpenAPI 3.1 document                       |
| GET    | `/docs`                      | Interactive API reference                  |

Errors use `{ error: { code, message } }`. `/` redirects to `/docs`.

## OpenAPI and the reference

Routes are declared with `@hono/zod-openapi` (`createRoute` in `src/routes`),
using the Zod schemas in `src/schemas.ts`. The same declarations type-check the
handlers and generate `/openapi.json`, so a new route shows up in the spec and
the reference once it is registered with `app.openapi()`. Keep the schemas in
step with the types in `@westride/api-client`; handlers `satisfies` both.

The reference at `/docs` is a React + Astryx app in `explorer/`. It loads
`/openapi.json`, renders each operation's parameters and responses, and sends
live requests from the browser. `scripts/build-explorer.ts` bundles it into
`explorer/dist/assets.json`, which `src/explorer.ts` imports so the server
bundle carries the UI. Vercel's Hono preset ignores `serveStatic()`, so the
function serves the assets itself.

## Local development

```bash
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL
bun run dev:api                          # http://localhost:3001/docs
```

`bun run dev` builds the explorer, rebuilds it when files in `explorer/`
change, and restarts the server when the bundle or server code changes.
