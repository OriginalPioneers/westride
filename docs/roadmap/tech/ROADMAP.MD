# WeStride Roadmap - Tech

- Build Out AI Agent Coding Instructions/Markdown
- Enable Cloudflare/Vercel Protections
- Enable rate limiting for API and MCP.
- Ensure apps are GDPR compliant.
- Allow the designer/etc agents to access Muse Wonder to generate images, etc and then store the artifacts/attach them to the idea/project/etc.
- Add voice to text.
- Allow the Muse companion to chat back to the user.
- We should offer more ways to run Muse Code to complete a ticket:
-- Cloud : AWS, Google Cloud, Azure, etc. (Vercel Sandbox and supporter computers are done.)
- Supporter runner follow-ups: publish the Docker image to GHCR from CI (`apps/runner/Dockerfile`, built from the repo root), add a cron that calls `reconcileStaleVolunteerJob` for jobs no device picked up, and let a volunteer job stream large results in chunks instead of one 8 MB request.

## Completed Tasks

- Supporters: pledges (tokens, compute), the contribution ledger, idea "looking for" flags and capital links (`packages/db/src/support-schema.ts`, migration 0022), sponsor payer resolution at job start (`apps/web/lib/support/payer.ts`), pledge credit at job finish.
- Supporter runner: Docker image under `apps/runner` (Bun + Muse Code, Ollama via `host.docker.internal`), device pairing/heartbeat/lease/result routes under `/integrations/runner/*`, shared wire protocol in `packages/runner-protocol`, install scripts at `/install.sh` and `/install.ps1`. Devices never hold GitHub credentials; the server commits returned files with the Git Data API (`apps/web/lib/github/commit-files.ts`).

- Add Clerk authentication.
- Add Neon database.
- Move to TurboRepo.
- Add private and public blob storage.
- Create Vercel deployment for design.
- Create Vercel deployment for mcp.
- Build out the "Tech Stack" page.
