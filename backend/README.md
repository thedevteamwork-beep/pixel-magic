# Pixel Magic backend

TypeScript (Express 5, Knex, Postgres). One image, two modes: `MODE=api` (public API, port 8080) and `MODE=worker` (internal tasks, port 8081). Auth is Supabase JWT (JWKS); billing is Paddle.

## Run locally

```bash
nvm use                 # Node 22 (the machine default may be older)
cp .env.example .env
npm ci
npm run db:up           # local Postgres on port 54329
npm run migrate
npm run seed            # catalog: Free plan, placeholder plans and an add-on
npm run dev:api         # http://localhost:8080
npm run dev:worker      # http://localhost:8081 (separate terminal)
```

`docker-compose.yml` uses `postgres:${POSTGRES_VERSION:-17}`. On a machine that already has another image, for example `postgres:14`, run `POSTGRES_VERSION=14 npm run db:up`.

`docker compose up -d --build` starts the db, api and worker with dummy Paddle/Supabase values. Compose waits until Postgres is healthy before the api runs migrations and starts, and before the worker starts; no need to start the db first. Check with `curl localhost:8080/_readyz` and `curl localhost:8081/_healthz`.

Grant credits manually: `npm run credits:grant -- <userId> <n> <days>`.

## Tests

```bash
npm run db:up
npm test                # vitest
npm run lint && npm run typecheck
```

Tests use `TEST_DATABASE_URL` (default `postgres://postgres:postgres@localhost:54329/pixel_magic_test`). Each run drops and recreates that database and migrates it from scratch, so its name must end in `_test`. They never call Paddle; it is faked.

## Endpoints

| Where  | Endpoint                                           | Notes                                                      |
| ------ | -------------------------------------------------- | ---------------------------------------------------------- |
| api    | `GET /_healthz`, `GET /_readyz`                    | liveness, readiness (checks DB)                            |
| api    | `GET /v1/plans`, `GET /v1/addons`                  | public catalog                                             |
| api    | `GET /v1/me`                                       | credits and subscription (auth)                            |
| api    | `POST /v1/billing/addons`                          | buy an add-on, returns a checkout                          |
| api    | `GET /v1/billing/subscription/preview?plan=`       | preview a plan change                                      |
| api    | `POST /v1/billing/subscription`                    | `{plan}`: checkout, schedule downgrade, or cancel (`free`) |
| api    | `DELETE /v1/billing/subscription/scheduled-change` | revert a scheduled downgrade or cancel                     |
| api    | `GET /v1/billing/invoices`                         | paid invoices                                              |
| api    | `POST /webhooks/paddle`                            | signed Paddle events                                       |
| worker | `GET /_healthz`, `GET /_readyz`                    |                                                            |
| worker | `POST /tasks/billing-sweep`                        | hourly sweep (see Cloud Scheduler)                         |

A user needs an email to buy. Users without one get `422 VALIDATION_FAILED`.

## Environment

| Key                        | Default         | Purpose                                                 |
| -------------------------- | --------------- | ------------------------------------------------------- |
| `MODE`                     | required        | `api` or `worker`                                       |
| `PORT`                     | 8080            | HTTP port                                               |
| `NODE_ENV`                 | development     | `development`, `test` or `production`                   |
| `LOG_LEVEL`                | info            | winston log level                                       |
| `DATABASE_URL`             | required        | app connection string                                   |
| `DATABASE_MIGRATION_URL`   | `DATABASE_URL`  | connection used by `npm run migrate`                    |
| `DB_POOL_MAX`              | 5               | max DB pool size                                        |
| `SUPABASE_URL`             | required        | JWKS is read from `<url>/auth/v1/.well-known/jwks.json` |
| `CORS_ORIGINS`             | empty           | comma-separated allowed origins                         |
| `PADDLE_API_KEY`           | required        | Paddle API key                                          |
| `PADDLE_WEBHOOK_SECRET`    | required        | notification destination secret (`pdl_ntfset_...`)      |
| `PADDLE_ENV`               | sandbox         | `sandbox` or `production`                               |
| `FREE_PLAN_NAME`           | free            | name of the Free plan row                               |
| `CARRYOVER_VALIDITY_DAYS`  | 30              | how long carried-over credits stay valid                |
| `PLAN_CHANGE_LOCK_MINUTES` | 60              | no plan changes this close to renewal                   |
| `CHECKOUT_REUSE_MINUTES`   | 30              | a draft checkout younger than this is reused            |
| `RENEWAL_GRACE_MINUTES`    | 60              | grace after a period ends before its credits stop       |
| `SUPABASE_SECRET_KEY`      | required        | service key for Storage (server only)                   |
| `FAL_KEY`                  | required        | fal.ai API key                                          |
| `API_PUBLIC_URL`           | required        | public URL of the API (fal webhook target)              |
| `WORKER_URL`               | required        | URL the task queue calls for worker routes              |
| `STORAGE_BUCKET_INPUTS`    | inputs          | Storage bucket for uploads                              |
| `STORAGE_BUCKET_OUTPUTS`   | outputs         | Storage bucket for generated files                      |
| `FAL_JWKS_URL`             | fal public JWKS | verifies fal webhook signatures                         |
| `TASKS_MODE`               | http            | `http` (local) or `cloud` (Cloud Tasks)                 |
| `TASKS_QUEUE_GENERATION`   | generation      | generation queue name                                   |
| `TASKS_QUEUE_FINALIZATION` | finalization    | finalization queue name                                 |
| `GCP_PROJECT_ID`           | unset           | required when `TASKS_MODE=cloud`                        |
| `GCP_REGION`               | unset           | required when `TASKS_MODE=cloud`                        |
| `TASKS_SERVICE_ACCOUNT`    | unset           | required when `TASKS_MODE=cloud`                        |
| `MAX_ACTIVE_JOBS_PER_USER` | 4               | concurrent unfinished jobs per user                     |
| `UPLOAD_MAX_BYTES`         | 20971520        | max upload size in bytes                                |
| `UPLOAD_MIME_TYPES`        | png,jpeg,webp   | comma-separated allowed upload MIME types               |

## Paddle sandbox setup

1. Developer tools > Authentication: create an API key, put it in `PADDLE_API_KEY`. Keep `PADDLE_ENV=sandbox`.
2. Developer tools > Notifications: add a destination with URL `https://<public-host>/webhooks/paddle` (use a tunnel such as ngrok locally). Subscribe to the `subscription.*` and `transaction.*` events. Copy the `pdl_ntfset_` secret into `PADDLE_WEBHOOK_SECRET`.
3. Checkout settings: set a default payment link. `checkoutUrl` needs it.
4. Retries and dunning: configure failed-payment handling to end in cancellation.
5. Leave subscription pausing off (plans spec section 6.7).

Paddle products and prices are created from the catalog on first use. Replace the placeholder catalog (`TODO(pricing)`) before launch.

## Sandbox acceptance checklist

Plans spec section 10, milestone 3. Done when each step works and credits are granted exactly once, even if the webhook is replayed (resend it from the Paddle dashboard). Sign in as a fresh user with an email. Check state with `GET /v1/me` and in the DB (`app.subscriptions`, `app.invoices`, `app.credit_grants`, `app.payment_events`).

1. Sign-up: `GET /v1/me` shows the Free plan and its grant. One active Free `app.subscriptions` row, one grant.
2. Buy Starter: `POST /v1/billing/subscription {"plan":"starter_monthly"}`, open `checkoutUrl`, pay with a sandbox card. After `transaction.completed`: invoice `paid`, Starter row `active`, Free row `upgraded` and its leftover credits end (Free credits are not carried over), one Starter grant. Replay the webhook: nothing changes.
3. Upgrade to Pro: same call with `{"plan":"pro_monthly"}`. After payment: Pro `active`, Starter `upgraded`, Starter's old Paddle subscription flagged and then cancelled, leftover credits converted into a carryover grant, one Pro grant. Replay: nothing changes.
4. Schedule a downgrade: `POST /v1/billing/subscription {"plan":"starter_monthly"}` while on Pro. Pro row has `next_plan_id` = Starter and nothing is charged now. Use a sandbox subscription with a short billing period, let it renew: the renewal `transaction.completed` makes Starter `active`, Pro `downgraded`, one new grant. Replay: nothing changes. Also try `DELETE /v1/billing/subscription/scheduled-change` before renewal: `next_plan_id` goes back to the current plan.
5. Cancel: `POST /v1/billing/subscription {"plan":"free"}` schedules the cancel (`next_plan_id` = Free). At period end `subscription.canceled` arrives: paid row `canceled`, a Free row and grant open, old credits are not converted and expire on their own date.
6. Buy an add-on: `POST /v1/billing/addons {"addon":"<name>"}`, pay. Invoice `paid`, one `app.customer_addons` row with `expires_at = bought_at + duration_days`, credits grant exists once. Replay: nothing changes.
7. Existing Paddle customer: sign up a second user with an email that already exists in Paddle and start a checkout. It must reuse that Paddle customer (`app.profiles.paddle_customer_id` equals the existing id) and not fail.

Also confirm, because these could not be tested locally:

- The email-conflict path (step 7) works against real Paddle. Note which ApiError code Paddle returns. The client matches `customer_already_exists` or `conflict`; adjust `src/clients/paddle.ts` if it differs.
- Real webhook payloads pass `parsePaddleEvent` (`src/clients/paddleEvents.ts`). Check `app.payment_events` and the worker/api logs for unparseable-event records.
- `checkoutUrl` is returned (needs the default payment link).
- A failed renewal goes `past_due`, then ends in cancellation (dunning), and the user lands on Free.
- Pausing stays off.

## Cloud Scheduler

The billing sweep (renews expired Free rows, retries pending Paddle cancels, expires old draft invoices) also logs ERROR for rows it can't fix: active paid rows whose period ended over 7 days ago or that Paddle paused, and Paddle cancels still failing after 24 hours. Alert on those logs. It needs an hourly Cloud Scheduler job: `POST /tasks/billing-sweep` on the worker service. Set it up in the deploy milestone, not here.
