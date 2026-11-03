# WeStride Cloud

WeStride is free when a member brings their own Meta AI account and their own compute account, either Vercel or Modal: Muse runs on their Meta key and Muse Code sandboxes on their Vercel plan or Modal workspace, and WeStride never pays for either. **WeStride Cloud** is the alternative for members who have neither. They fund a balance on their WeStride account (by card through Stripe, or by redeeming a code), and Muse calls run on WeStride's own Meta key while sandboxes run as [Modal Sandboxes](https://modal.com/docs/guide/sandboxes) on WeStride's Modal account. Every call and every sandbox is charged to the member's balance at the prices on `/pricing`.

Pages:

- `/pricing` (public, in the primary nav): Free with your own accounts versus WeStride Cloud pay-as-you-go, the per-model price list, compute rates, and how funds and codes work.
- `/cloud` (signed in; the WeStride Cloud tab of the profile pages): balance and totals, add funds, redeem a code, choose which provider to use first, and the ledger.
- Connections (`/settings`) is where members connect Meta, Vercel, and Modal, and points those without them to `/cloud`.

## Bringing your own Modal account

A member connects Modal the way they connect Vercel, from Connections, except that Modal has no sign-in flow for third parties, so the only way is to paste an API token: the id (`ak-…`) and the secret (`as-…`) from Modal → Settings → API Tokens. WeStride checks the token by listing the workspace's environments, keeps both halves encrypted under `MODAL_TOKEN_ENCRYPTION_KEY` (`apps/web/lib/modal/connection.ts`), records the environment sandboxes run in (Modal's default `main` when the workspace has one; changeable in the panel), and creates an app named `westride-muse-code` in that environment on first use. Disconnecting forgets the token; revoking it is done on modal.com.

Sandboxes on a member's own Modal account use the same image, entrypoint, and runner as WeStride Cloud's (`apps/web/lib/cloud/sandbox.ts`), only with the member's credentials; Modal bills their workspace, and WeStride charges nothing. The environment is always passed to the SDK explicitly: left blank, the Modal client would read this server's `MODAL_ENVIRONMENT`, which belongs to WeStride's workspace.

When a member has both Vercel and Modal connected, `cloud_accounts.sandbox_provider` says which one hosts their sandboxes. Connecting (or reconnecting) an account makes it the choice; each panel on Connections shows which is active and offers to switch. With only one connected, that one is used regardless.

## Setup

Apply the migration with the normal workflow (`bun run db:migrate` from `packages/db`):

- `0024_westride_cloud.sql`: `cloud_accounts`, `cloud_ledger_entries`, `cloud_redemption_codes`, `cloud_code_redemptions`, their enums, `MODAL_SANDBOX` on `runner_kind`, `agent_jobs.muse_source`, and `agent_runs.{runner_kind,muse_source,usage columns}`.
- `0026_modal_connections.sql`: `modal_connections`, the `compute_source` enum and column on `agent_runs` and `agent_jobs` (backfilled to `WESTRIDE_CLOUD` for existing Modal rows, which were all WeStride Cloud's), and `cloud_accounts.sandbox_provider`.

Members' own Modal accounts need only `MODAL_TOKEN_ENCRYPTION_KEY` (32 random bytes, base64, like the other `*_TOKEN_ENCRYPTION_KEY`s); without it the Modal row on Connections says it is not set up. Each part of WeStride Cloud is independent; leave its variables blank and that part is simply not offered (the pricing page marks it "Coming soon", and members fall back to their own accounts).

| Part | Variables | Notes |
| --- | --- | --- |
| Meta AI through WeStride Cloud | `WESTRIDE_CLOUD_META_API_KEY` | An API key from WeStride's own [dev.meta.ai](https://dev.meta.ai/) account. |
| Compute through WeStride Cloud | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`; optional `MODAL_ENVIRONMENT`, `WESTRIDE_CLOUD_MODAL_APP_NAME` (default `westride-cloud`) | A token from WeStride's own Modal workspace (Settings → API Tokens); unrelated to members' tokens. WeStride creates the app on first use. Code runs also need everything Build Studio's runner needs (`GITHUB_APP_*`, `BUILD_RUNNER_CALLBACK_URL`); a run needs only one of this, `VERCEL_TOKEN_ENCRYPTION_KEY`, or `MODAL_TOKEN_ENCRYPTION_KEY` to be possible. |
| Adding funds by card | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Checkout in payment mode. Add a webhook endpoint at `<origin>/integrations/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Without the webhook secret, balances are credited only when the member returns from Stripe. Locally: `stripe listen --forward-to localhost:3000/integrations/stripe/webhook`. |
| Prices | optional `WESTRIDE_CLOUD_AI_MARKUP_PERCENT` (default 20), `WESTRIDE_CLOUD_COMPUTE_VCPU_HOUR_CENTS` (default 20) | Markup on Meta's list prices, and what a vCPU-hour of sandbox time costs the member. |

Redemption codes need nothing beyond the database.

### Redemption codes

```sh
bun run cloud:code -- --amount 25                      # a random $25 code, unlimited uses
bun run cloud:code -- --amount 10 --code HACKATHON-2026 --uses 200 --expires 2026-12-31 --note "Meta hackathon"
bun run cloud:code -- --list
bun run cloud:code -- --deactivate HACKATHON-2026
bun run cloud:code -- --amount 25 --target production  # against the production database
```

A code is worth a fixed amount, may cap total redemptions and have an expiry, and can be redeemed once per member. `redeemCode` in `packages/db/src/cloud.ts` increments the counter with a guarded `UPDATE`, records the per-member redemption, and credits the ledger; a duplicate anywhere in that chain rolls back the earlier steps, so retries are safe without a transaction.

## How it works

### Balance

The balance is the sum of `cloud_ledger_entries.amount_micros` for the member (USD micros, like the rest of the usage accounting). There is no cached balance column, so it cannot drift. Every entry has a unique `reference` (`stripe:<session>`, `code:<code>:<member>`, `muse:<request>`, `job:<job>`, `job-compute:<job>`, `run:<run>`, `run-compute:<run>`, `transcribe:<uuid>`), and `recordLedgerEntry` uses `ON CONFLICT DO NOTHING`, so a Stripe webhook retry or a second completion callback cannot double-charge or double-credit.

### Choosing a provider

`apps/web/lib/cloud/provider.ts` is the single place that decides. `resolveMuseAccess(userId)` returns the key to call Muse with and where it came from (`OWN` or `WESTRIDE_CLOUD`); `resolveSandboxAccess(userId)` returns a `SandboxAccess` whose `kind` is the API that drives the sandbox (`VERCEL_SANDBOX` or `MODAL_SANDBOX`, with credentials) and whose `source` is who pays (`OWN` for the member's Vercel or Modal account, `WESTRIDE_CLOUD` for WeStride's Modal account). Both honour the member's preference (`cloud_accounts.provider_preference`, set on `/cloud`): with **My own accounts** first, their connection is used when it exists and WeStride Cloud when it does not; with **WeStride Cloud** first, the balance is used when it covers at least one call (`$0.05`) or one sandbox start (`$0.50`), and their own connection otherwise. The member who decides is always the payer, which for a sponsored job is the sponsor.

Every former call to `getMuseApiKey` / `getVercelSandboxCredentials` for running work now goes through these: Idea Factory, planning, images, dictation, agent report jobs, code jobs, and Build Studio runs.

### Charging

Charges are recorded when work finishes, never estimated up front:

- Muse calls through the Model API log a `muse_requests` row as before; `settleMuseRequest` (`apps/web/lib/cloud/billing.ts`) then writes a negative `AI_USAGE` entry of the request's estimated cost times the markup. Dictation uses `settleMuseUsage` with its per-hour price.
- Code jobs and Build Studio runs charge their reported token usage (`job:<id>`, `run:<id>`) and, when their `compute_source` is `WESTRIDE_CLOUD`, their wall-clock seconds × vCPUs at the compute rate with a 60-second minimum (`job-compute:<id>`, `run-compute:<id>`). Cancelled runs still pay for compute used.
- Work on the member's own accounts (`muse_source` or `compute_source` of `OWN`, which covers both Vercel and a member's own Modal account) is never charged.

A balance can go slightly negative when a long run outspends it; the member simply cannot start more work until they top up.

### Modal sandboxes

`apps/web/lib/cloud/sandbox.ts` launches either kind from one input, with the credentials the `SandboxAccess` carries (the member's own Modal token, or WeStride Cloud's from `MODAL_TOKEN_ID`/`MODAL_TOKEN_SECRET`). On Modal the image is `node:22-bookworm`, the sandbox waits for a start flag, and the same runner script Vercel uses (`lib/build/agent/runner-script.ts`) clones the repository itself (`CLONE_REPO=1`) because the image has no checkout. Meta and GitHub tokens travel as Modal secrets. `agent_runs.sandbox_name` / `agent_jobs.sandbox_name` hold the Modal sandbox id; `runner_kind` says which API to use to stop it, and `compute_source` whose credentials: WeStride's for `WESTRIDE_CLOUD`, the payer's Modal connection for `OWN` (if they have since disconnected, the sandbox stops at its timeout, as with Vercel).

## Data model

- `cloud_accounts` (one per member, created on first use): `provider_preference`, `sandbox_provider` (Vercel or Modal, when both are connected), `stripe_customer_id`.
- `modal_connections` (one per member): encrypted `token_id` and `token_secret`, `token_id_suffix` for display, `environment`, `app_name`.
- `cloud_ledger_entries`: signed `amount_micros`, `kind` (`TOP_UP`, `CODE`, `AI_USAGE`, `COMPUTE_USAGE`, `ADJUSTMENT`), unique `reference`, and what it paid for (`model`, tokens, `compute_seconds`, `vcpus`).
- `cloud_redemption_codes` and `cloud_code_redemptions` (one row per member per code).
- `agent_runs` and `agent_jobs` record `runner_kind`, `compute_source`, and `muse_source` so a finished job knows how to stop its sandbox and what to charge.
