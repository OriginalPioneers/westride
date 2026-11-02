# WeStride Cloud

WeStride is free when a member brings their own Meta AI account and their own Vercel account: Muse runs on their Meta key and Muse Code sandboxes on their Vercel plan, and WeStride never pays for either. **WeStride Cloud** is the alternative for members who have neither. They fund a balance on their WeStride account (by card through Stripe, or by redeeming a code), and Muse calls run on WeStride's own Meta key while sandboxes run as [Modal Sandboxes](https://modal.com/docs/guide/sandboxes) on WeStride's Modal account. Every call and every sandbox is charged to the member's balance at the prices on `/pricing`.

Pages:

- `/pricing` (public, in the primary nav): Free with your own accounts versus WeStride Cloud pay-as-you-go, the per-model price list, compute rates, and how funds and codes work.
- `/cloud` (signed in; account menu → WeStride Cloud): balance and totals, add funds, redeem a code, choose which provider to use first, and the ledger.
- Settings shows the balance and preference with a link to `/cloud`.

## Setup

Apply the migration with the normal workflow (`bun run db:migrate` from `packages/db`):

- `0024_westride_cloud.sql`: `cloud_accounts`, `cloud_ledger_entries`, `cloud_redemption_codes`, `cloud_code_redemptions`, their enums, `MODAL_SANDBOX` on `runner_kind`, `agent_jobs.muse_source`, and `agent_runs.{runner_kind,muse_source,usage columns}`.

Each part of WeStride Cloud is independent; leave its variables blank and that part is simply not offered (the pricing page marks it "Coming soon", and members fall back to their own accounts).

| Part | Variables | Notes |
| --- | --- | --- |
| Meta AI through WeStride Cloud | `WESTRIDE_CLOUD_META_API_KEY` | An API key from WeStride's own [dev.meta.ai](https://dev.meta.ai/) account. |
| Compute through WeStride Cloud | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`; optional `MODAL_ENVIRONMENT`, `WESTRIDE_CLOUD_MODAL_APP_NAME` (default `westride-cloud`) | From Modal → Settings → API Tokens. WeStride creates the app on first use. Code runs also need everything Build Studio's runner needs (`GITHUB_APP_*`, `BUILD_RUNNER_CALLBACK_URL`); `VERCEL_TOKEN_ENCRYPTION_KEY` is no longer required when Modal is configured. |
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

`apps/web/lib/cloud/provider.ts` is the single place that decides. `resolveMuseAccess(userId)` returns the key to call Muse with and where it came from (`OWN` or `WESTRIDE_CLOUD`); `resolveSandboxAccess(userId)` returns Vercel credentials or `MODAL_SANDBOX`. Both honour the member's preference (`cloud_accounts.provider_preference`, set on `/cloud`): with **My own accounts** first, their connection is used when it exists and WeStride Cloud when it does not; with **WeStride Cloud** first, the balance is used when it covers at least one call (`$0.05`) or one sandbox start (`$0.50`), and their own connection otherwise. The member who decides is always the payer, which for a sponsored job is the sponsor.

Every former call to `getMuseApiKey` / `getVercelSandboxCredentials` for running work now goes through these: Idea Factory, planning, images, dictation, agent report jobs, code jobs, and Build Studio runs.

### Charging

Charges are recorded when work finishes, never estimated up front:

- Muse calls through the Model API log a `muse_requests` row as before; `settleMuseRequest` (`apps/web/lib/cloud/billing.ts`) then writes a negative `AI_USAGE` entry of the request's estimated cost times the markup. Dictation uses `settleMuseUsage` with its per-hour price.
- Code jobs and Build Studio runs charge their reported token usage (`job:<id>`, `run:<id>`) and, when they ran on Modal, their wall-clock seconds × vCPUs at the compute rate with a 60-second minimum (`job-compute:<id>`, `run-compute:<id>`). Cancelled runs still pay for compute used.
- Work on the member's own accounts (`OWN`, `VERCEL_SANDBOX`) is never charged.

A balance can go slightly negative when a long run outspends it; the member simply cannot start more work until they top up.

### Modal sandboxes

`apps/web/lib/cloud/sandbox.ts` launches either kind from one input. On Modal the image is `node:22-bookworm`, the sandbox waits for a start flag, and the same runner script Vercel uses (`lib/build/agent/runner-script.ts`) clones the repository itself (`CLONE_REPO=1`) because the image has no checkout. Meta and GitHub tokens travel as Modal secrets. `agent_runs.sandbox_name` / `agent_jobs.sandbox_name` hold the Modal sandbox id; `runner_kind` says which API to use to stop it.

## Data model

- `cloud_accounts` (one per member, created on first use): `provider_preference`, `stripe_customer_id`.
- `cloud_ledger_entries`: signed `amount_micros`, `kind` (`TOP_UP`, `CODE`, `AI_USAGE`, `COMPUTE_USAGE`, `ADJUSTMENT`), unique `reference`, and what it paid for (`model`, tokens, `compute_seconds`, `vcpus`).
- `cloud_redemption_codes` and `cloud_code_redemptions` (one row per member per code).
- `agent_runs` and `agent_jobs` record `runner_kind` and `muse_source` so a finished job knows what to charge.
