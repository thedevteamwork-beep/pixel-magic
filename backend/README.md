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
PORT=8081 npm run dev:worker   # http://localhost:8081 (separate terminal)
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

Tests never touch the network (fal, Storage and the queue are faked). They use `TEST_DATABASE_URL` (default `postgres://postgres:postgres@localhost:54329/pixel_magic_test`). Each run drops and recreates that database and migrates it from scratch, so its name must end in `_test`. They never call Paddle; it is faked.

## Project layout

API routes live in `src/api/routes/`, one `*.routes.ts` file per area:

- `public/`: APIs anyone can call, no login (plans, add-ons, models, credit estimate).
- `panel/`: APIs for the logged-in app user (me, billing, uploads, jobs). `panel/index.ts` applies the login guard once per area.
- `health.routes.ts` and `webhooks.routes.ts` stay at the top: they are not user APIs.

Route files only parse and validate; the logic is in `src/services/`.

## Endpoints

| Where  | Endpoint                                           | Notes                                                       |
| ------ | -------------------------------------------------- | ----------------------------------------------------------- |
| api    | `GET /_healthz`, `GET /_readyz`                    | liveness, readiness (checks DB)                             |
| api    | `GET /v1/plans`, `GET /v1/addons`                  | public catalog                                              |
| api    | `GET /v1/me`                                       | credits and subscription (auth)                             |
| api    | `POST /v1/billing/addons`                          | buy an add-on, returns a checkout                           |
| api    | `GET /v1/billing/subscription/preview?plan=`       | preview a plan change                                       |
| api    | `POST /v1/billing/subscription`                    | `{plan}`: checkout, schedule downgrade, or cancel (`free`)  |
| api    | `DELETE /v1/billing/subscription/scheduled-change` | revert a scheduled downgrade or cancel                      |
| api    | `GET /v1/billing/invoices`                         | paid invoices                                               |
| api    | `POST /v1/uploads`                                 | `{filename, mimeType, sizeBytes}`: signed upload URL (auth) |
| api    | `GET /v1/models`                                   | model catalog with `credits: {min, max}` (public)           |
| api    | `POST /v1/credits/estimate`                        | price a job before creating it (public, see Credit pricing) |
| api    | `POST /v1/jobs`                                    | create a job; `Idempotency-Key` header required (auth)      |
| api    | `GET /v1/jobs/:id`                                 | job status (auth)                                           |
| api    | `GET /v1/jobs/:id/download-url?index=`             | signed download URL of a completed output (auth)            |
| api    | `POST /webhooks/paddle`                            | signed Paddle events                                        |
| api    | `POST /webhooks/fal`                               | signed fal events (`?jobId=` links a request, see below)    |
| worker | `GET /_healthz`, `GET /_readyz`                    |                                                             |
| worker | `POST /tasks/billing-sweep`                        | hourly sweep (see Cloud Scheduler)                          |
| worker | `POST /tasks/reconcile`                            | recovers stuck jobs (every 5 minutes)                       |
| worker | `POST /tasks/generate`, `POST /tasks/finalize`     | `{jobId}`; called by the task queue                         |

A user needs an email to buy. Users without one get `422 VALIDATION_FAILED`.

## Environment

| Key                        | Default         | Purpose                                                       |
| -------------------------- | --------------- | ------------------------------------------------------------- |
| `MODE`                     | required        | `api` or `worker`                                             |
| `PORT`                     | 8080            | HTTP port                                                     |
| `NODE_ENV`                 | development     | `development`, `test` or `production`                         |
| `LOG_LEVEL`                | info            | winston log level                                             |
| `DATABASE_URL`             | required        | app connection string                                         |
| `DATABASE_MIGRATION_URL`   | `DATABASE_URL`  | connection used by `npm run migrate`                          |
| `DB_POOL_MAX`              | 5               | max DB pool size                                              |
| `SUPABASE_URL`             | required        | JWKS is read from `<url>/auth/v1/.well-known/jwks.json`       |
| `CORS_ORIGINS`             | empty           | comma-separated allowed origins                               |
| `PADDLE_API_KEY`           | required        | Paddle API key                                                |
| `PADDLE_WEBHOOK_SECRET`    | required        | notification destination secret (`pdl_ntfset_...`)            |
| `PADDLE_ENV`               | sandbox         | `sandbox` or `production`                                     |
| `FREE_PLAN_NAME`           | free            | name of the Free plan row                                     |
| `CARRYOVER_VALIDITY_DAYS`  | 30              | how long carried-over credits stay valid                      |
| `PLAN_CHANGE_LOCK_MINUTES` | 60              | no plan changes this close to renewal                         |
| `CHECKOUT_REUSE_MINUTES`   | 30              | a draft checkout younger than this is reused                  |
| `RENEWAL_GRACE_MINUTES`    | 60              | grace after a period ends before its credits stop             |
| `SUPABASE_SECRET_KEY`      | required        | service key for Storage (server only)                         |
| `FAL_KEY`                  | required        | fal.ai API key                                                |
| `API_PUBLIC_URL`           | required        | public URL of the API (fal webhook target)                    |
| `WORKER_URL`               | required        | URL the task queue calls for worker routes                    |
| `STORAGE_BUCKET_INPUTS`    | inputs          | Storage bucket for uploads                                    |
| `STORAGE_BUCKET_OUTPUTS`   | outputs         | Storage bucket for generated files                            |
| `FAL_JWKS_URL`             | fal public JWKS | verifies fal webhook signatures                               |
| `FAL_WEBHOOK_USER_ID`      | optional        | set in production to our fal user id                          |
| `TASKS_MODE`               | http            | `http` (local) or `cloud` (Cloud Tasks); `cloud` on Cloud Run |
| `TASKS_QUEUE_GENERATION`   | generation      | generation queue name                                         |
| `TASKS_QUEUE_FINALIZATION` | finalization    | finalization queue name                                       |
| `GCP_PROJECT_ID`           | unset           | required when `TASKS_MODE=cloud`                              |
| `GCP_REGION`               | unset           | required when `TASKS_MODE=cloud`                              |
| `TASKS_SERVICE_ACCOUNT`    | unset           | required when `TASKS_MODE=cloud`                              |
| `MAX_ACTIVE_JOBS_PER_USER` | 4               | concurrent unfinished jobs per user                           |
| `UPLOAD_MAX_BYTES`         | 20971520        | max upload size in bytes                                      |
| `UPLOAD_MIME_TYPES`        | png,jpeg,webp   | comma-separated allowed upload MIME types (not empty)         |
| `TIERED_CREDIT_MAPPING`    | built-in        | JSON credit prices per model, replaces the default (below)    |

An optional key set to an empty value (`KEY=`) counts as unset. One trailing slash on `API_PUBLIC_URL` and `WORKER_URL` is dropped. On Cloud Run (where `K_SERVICE` is set) the app refuses to start with `TASKS_MODE=http`: the local queue's fire-and-forget POSTs have no retries or auth.

## Credit pricing

Every model is priced by `TIERED_CREDIT_MAPPING`, a JSON object with one entry per model key. When it is set it replaces the built-in default completely (defaults live in `src/credits/defaultTieredCreditMapping.ts`, marked `TODO(pricing)`). The app checks it at startup and refuses to start if a model has no entry, an entry names an unknown model, a tier setup is wrong, or any property is unknown. A bad value (invalid JSON, a negative rate) fails config loading with a message naming `TIERED_CREDIT_MAPPING`.

```json
{
  "kling21": {
    "tiers": [
      {
        "name": "Basic",
        "isDefault": true,
        "meters": [
          { "metric": "duration", "unitSize": 1, "rate": 6, "round": "ceil" }
        ]
      },
      {
        "name": "Image to video",
        "priority": 1,
        "conditions": {
          "all": [{ "fact": "image", "operator": "equal", "value": true }]
        },
        "credits": 5,
        "meters": [{ "metric": "duration", "unitSize": 1, "rate": 7 }]
      }
    ]
  },
  "flux-schnell": {
    "tiers": [
      {
        "name": "Basic",
        "isDefault": true,
        "meters": [{ "metric": "images", "unitSize": 1, "rate": 1 }]
      }
    ]
  }
}
```

- Each model has exactly one `isDefault` tier (no `conditions`). Other tiers need `conditions` and are checked in ascending `priority` (missing = 1, ties keep file order); the first match wins, else the default tier is used.
- Conditions test a `fact` with `equal`, `notEqual`, `greaterThan`, `greaterThanInclusive`, `lessThan`, `lessThanInclusive`, `in` or `notIn` (the last two take a list), and can be nested in `{ "all": [...] }` / `{ "any": [...] }`. A model's facts are its inputs (not `prompt`), its billing units, and `image` (true when the job has an upload). Unit facts (`duration`, `images`) are numbers, so write `{ "fact": "duration", "operator": "equal", "value": 10 }`, not `"10"`; a condition value must have the type of its fact, and `greaterThan` and the other ordering operators need a number fact. Every tier must cost something (base `credits` above 0 or a meter with a rate above 0); a job priced at 0 or above 2147483647 credits fails with a server error.
- A tier costs `credits` (default 0) plus, for each meter, `round(value / unitSize) x rate`. `round` is `ceil` (default), `floor`, `round` or `precise`.
- Supported units (`src/credits/units.ts`): `duration` (seconds) and `images` (count). A meter's `metric` must be a unit the model declares in `billing.units`. Adding a unit means editing that file.
- Credits are whole numbers: the tier total can be fractional and is rounded up once, at the end. A job reserves exactly what the estimate returns.

### POST /v1/credits/estimate

Public. Body (strict): `{ "model": "kling21", "options": { "duration": "10" }, "uploadCount": 0, "count": 1 }`. Only `model` is required; `options` defaults to `{}`, `uploadCount` (0 to 10, within the model's upload limits) to 0 and `count` (1 to 20) to 1. An unknown model, an unknown option, a bad value or a bad upload count returns `422 VALIDATION_FAILED`.

```json
{
  "model": "kling21",
  "count": 1,
  "tier": "Basic",
  "creditsPerJob": 60,
  "totalCredits": 60,
  "breakdown": [
    {
      "unit": "duration",
      "label": "seconds",
      "quantity": 10,
      "rate": 6,
      "credits": 60
    }
  ]
}
```

`GET /v1/models` shows `credits: { "min": 30, "max": 60 }` for each model (the cheapest and the dearest job) instead of a single cost.

## Generation flow

```
client                API                         Cloud Tasks        worker                      fal
  | POST /v1/uploads   |                               |               |                         |
  |------------------->| signed upload URL             |               |                         |
  | PUT file to Storage (inputs bucket)                |               |                         |
  | POST /v1/jobs      |                               |               |                         |
  |------------------->| reserve credits, insert job   |               |                         |
  |                    | (queued) ---- generate -----> |-------------->| POST /tasks/generate    |
  |                    |                               |               | submit (with webhook) ->|
  |                    |                               |               | job -> submitted        |
  |                    |<------------- signed webhook POST /webhooks/fal ------------------------|
  |                    | verify, link, ---- finalize ->|-------------->| POST /tasks/finalize    |
  |                    |                               |               | fetch result, copy to   |
  |                    |                               |               | outputs bucket, capture |
  |                    |                               |               | credits -> completed    |
  | GET /v1/jobs/:id   |                               |               |                         |
  | GET /v1/jobs/:id/download-url -> signed URL        |               |                         |
```

Job states: `queued` -> `submitting` -> `submitted` -> `finalizing` -> `completed`. Any state except `completed` can go to `failed`. `completed` and `failed` are final. Creating a job reserves its credits; `completed` captures them, `failed` releases them. A job in an active state (`queued`, `submitting`, `submitted`, `finalizing`) counts toward `MAX_ACTIVE_JOBS_PER_USER`.

The reconciler (`POST /tasks/reconcile`) makes sure every job keeps moving:

- It re-queues stale `queued` jobs and `submitting` jobs whose lease ran out. Generate fails a job with `SUBMIT_FAILED` after 5 attempts.
- It re-queues finalize for `finalizing` jobs whose lease ran out, or fails them `TIMED_OUT` once they were submitted more than the model's timeout + 60 minutes ago (120 minutes if the model is gone).
- It polls `submitted` jobs that fal hasn't called back about (after about 3 minutes) and queues finalize when fal answers `COMPLETED`, or when the job's model was removed (finalize then fails it `MODEL_UNAVAILABLE`).
- For a `submitted` job past the model's timeout it asks fal first. `IN_QUEUE` or `IN_PROGRESS`: cancel at fal and fail `TIMED_OUT`. `COMPLETED`: queue finalize instead, so a finished result isn't lost (for example one whose copy kept failing during a Storage outage). A fal error: try again on the next run. Past a hard ceiling of timeout + 60 minutes the job is cancelled and failed `TIMED_OUT` whatever fal says.

fal webhooks carry `?jobId=<id>` in the URL. The normal path matches the request id to a `fal_request_id` we saved. If the worker crashed before saving it, the webhook links the request to the job only after `fal.status` succeeds with our own key; a request id from another fal account makes `fal.status` answer with a 4xx such as 404, and it is treated as an orphan (logged, 200, never linked). A 401 or 403 means our own key is bad: the webhook answers 503 so fal retries, and nothing is linked.

### What users see when a job fails

`error.message` is a fixed sentence per code (`JOB_ERROR_MESSAGES` in `src/services/jobs/jobs.ts`). fal's raw error text, request ids and URLs go only to WARN logs. Credits are always released.

| Code                | Message                                                        |
| ------------------- | -------------------------------------------------------------- |
| `SUBMIT_REJECTED`   | The model rejected this request.                               |
| `SUBMIT_FAILED`     | The model service was unavailable. Your credits were returned. |
| `GENERATION_FAILED` | The model couldn't generate this request.                      |
| `CONTENT_BLOCKED`   | The result was blocked by the safety filter.                   |
| `OUTPUT_INVALID`    | The model returned an unusable result.                         |
| `TIMED_OUT`         | The generation took too long and was cancelled.                |
| `MODEL_UNAVAILABLE` | This model is no longer available.                             |

## Supabase setup

1. Storage: create two private buckets, `inputs` and `outputs` (the names are `STORAGE_BUCKET_INPUTS` and `STORAGE_BUCKET_OUTPUTS`).
2. `inputs`: set `file_size_limit` to 20 MB (20971520) and `allowed_mime_types` to `image/png,image/jpeg,image/webp`.
3. `SUPABASE_SECRET_KEY`: Project Settings > API Keys, the secret key (`sb_secret_...`). Server only; never ship it to a client.

## fal setup

- `FAL_KEY`: fal dashboard API key.
- Set `FAL_WEBHOOK_USER_ID` in production to our fal account's user id. fal signs webhooks for every fal customer with the same keys; until it is set, any fal customer's signed webhook passes the signature check (they still can't link to our jobs, but set it anyway). To find it: read `X-Fal-Webhook-User-Id` of our first real webhook (while the key is unset, the API logs it at info as `falUserId`), or look in the fal dashboard.
- The two models (`flux-schnell`, `kling21`) are placeholders (`TODO(pricing)`): their fal input/output schemas and prices were not checked against fal's model pages. Check them, and the credit costs, before launch.

## Local end-to-end run

1. In `.env` set `TASKS_MODE=http` and `WORKER_URL=http://localhost:8081`, plus real `FAL_KEY` and `SUPABASE_*` values and the two buckets above. Nothing loads `.env` for you: in each terminal run `set -a; source .env; set +a` before starting a process.
2. Run the API and the worker side by side: `npm run dev:api` and `PORT=8081 npm run dev:worker` (separate terminals; the worker must listen on the port in `WORKER_URL`).
3. fal webhooks need a public `API_PUBLIC_URL` (for example an ngrok tunnel to port 8080). Without one, jobs stay `submitted`; about 3 minutes after submission call `curl -X POST localhost:8081/tasks/reconcile` and the reconciler polls fal and queues finalize.

## Cloud Tasks queues

| Queue          | Max attempts | Backoff       | Dispatch deadline |
| -------------- | ------------ | ------------- | ----------------- |
| `generation`   | 5            | 10 s to 5 min | 60 s              |
| `finalization` | 10           | default       | 15 min            |

The worker service request timeout is 15 minutes (finalize copies files). Task names are deterministic per job and kind, so the same task is not queued twice.

## Milestone 2 acceptance check

Backend spec section 12. In a dev GCP/Supabase project, run one real image job and one real video job end to end (upload if the model needs one, `POST /v1/jobs`, wait for `completed`, `GET /v1/jobs/:id/download-url`, open the URL). Afterwards available credits have dropped by the cost and nothing is left reserved (check `GET /v1/me` and the job's rows in `app.credit_*`).

Also confirm against the real services, because these could not be tested locally:

- fal answers `queue.status` with a 4xx for a request id that belongs to another fal account (the `?jobId` linking path relies on it).
- fal's `X-Fal-Webhook-Request-Id` header equals the body's `request_id`. Otherwise every webhook gets 401 and jobs recover only through the reconciler's polling.
- fal re-signs a retried webhook with a fresh `X-Fal-Webhook-Timestamp`. Signatures more than 300 s from our clock are rejected, so a retry that kept the first timestamp would fail.
- Supabase Storage `info()` on a missing object reports "not found" (not an error).
- A streamed upload without `Content-Length` works.
- fal's real input and output shapes match the model files in `src/models/`.

### Counting orphan fal requests

An orphan is a fal request we paid for that no job points to (for example a double submit). Count them from logs (lines with `orphanFalRequest: true`) or with:

```sql
select count(*) from app.provider_events e
where not exists (select 1 from app.jobs j where j.fal_request_id = e.request_id);
```

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

The billing sweep (renews expired Free rows, retries pending Paddle cancels, expires old draft invoices) also logs ERROR for rows it can't fix: active paid rows whose period ended over 7 days ago or that Paddle paused, and Paddle cancels still failing after 24 hours. Alert on those logs. Set up two Cloud Scheduler jobs on the worker service, both with an OIDC token:

- `POST /tasks/reconcile` every 5 minutes (recovers stuck jobs and missed fal webhooks).
- `POST /tasks/billing-sweep` hourly.

Set them up in the deploy milestone.
