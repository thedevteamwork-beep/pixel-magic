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
- `panel/`: APIs for the logged-in app user (me, billing, uploads, jobs, projects). `panel/index.ts` applies the login guard once per area.
- `health.routes.ts` and `webhooks.routes.ts` stay at the top: they are not user APIs.

Route files only parse and validate; the logic is in `src/services/`.

## Endpoints

| Where  | Endpoint                                           | Notes                                                                                              |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| api    | `GET /_healthz`, `GET /_readyz`                    | liveness, readiness (checks DB)                                                                    |
| api    | `GET /v1/plans`, `GET /v1/addons`                  | public catalog                                                                                     |
| api    | `GET /v1/me`                                       | credits and subscription (auth)                                                                    |
| api    | `POST /v1/billing/addons`                          | buy an add-on, returns a checkout                                                                  |
| api    | `GET /v1/billing/subscription/preview?plan=`       | preview a plan change                                                                              |
| api    | `POST /v1/billing/subscription`                    | `{plan}`: checkout, schedule downgrade, or cancel (`free`)                                         |
| api    | `DELETE /v1/billing/subscription/scheduled-change` | revert a scheduled downgrade or cancel                                                             |
| api    | `GET /v1/billing/invoices`                         | paid invoices                                                                                      |
| api    | `POST /v1/uploads`                                 | `{filename, mimeType, sizeBytes}`: signed upload URL (auth)                                        |
| api    | `GET /v1/models`                                   | model catalog with `credits: {min, max}` (public)                                                  |
| api    | `POST /v1/credits/estimate/:plugin/:operation`     | price a job before creating it (public, see Credit pricing)                                        |
| api    | `POST /v1/projects`                                | `{type, title, data?}`: create a project (auth)                                                    |
| api    | `GET /v1/projects`                                 | list your projects, newest updated first, with `type`/`limit`/`cursor` and a signed `cover` (auth) |
| api    | `GET /v1/projects/:id`                             | one project (auth)                                                                                 |
| api    | `PATCH /v1/projects/:id`                           | `{title?, data?}`: rename or replace `data` (auth)                                                 |
| api    | `DELETE /v1/projects/:id`                          | delete a project; its jobs stay, unlinked (auth)                                                   |
| api    | `POST /v1/jobs/:plugin/:operation`                 | `{input, projectId?}`: create a job; `Idempotency-Key` header required (auth)                      |
| api    | `GET /v1/jobs`                                     | list your jobs, newest first, with `limit`/`cursor`, `?projectId=` (auth)                          |
| api    | `GET /v1/jobs/:id`                                 | status, plus signed output URLs once completed (auth)                                              |
| api    | `POST /webhooks/paddle`                            | signed Paddle events                                                                               |
| api    | `POST /webhooks/fal`                               | signed fal events (`?jobId=` links a request, see below)                                           |
| worker | `GET /_healthz`, `GET /_readyz`                    |                                                                                                    |
| worker | `POST /tasks/billing-sweep`                        | hourly sweep (see Cloud Scheduler)                                                                 |
| worker | `POST /tasks/reconcile`                            | recovers stuck jobs (every 5 minutes)                                                              |
| worker | `POST /tasks/generate`, `POST /tasks/finalize`     | `{jobId}`; called by the task queue                                                                |

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
  "kling21_generate": {
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
  "fluxSchnell_generate": {
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
- Conditions test a `fact` with `equal`, `notEqual`, `greaterThan`, `greaterThanInclusive`, `lessThan`, `lessThanInclusive`, `in` or `notIn` (the last two take a list), and can be nested in `{ "all": [...] }` / `{ "any": [...] }`. `all`, `any` and an `in` / `notIn` list must not be empty. A model's facts are its options (its inputs except `prompt` and the image), its billing units, and `image` (true when the job has an upload). A fact's type comes from the model schema: a string option is a string, an integer option a number, a boolean option a boolean; unit facts (`duration`, `images`) are numbers even when an option has the same name, so write `{ "fact": "duration", "operator": "equal", "value": 10 }`, not `"10"`. A condition value must have the type of its fact, and `greaterThan` and the other ordering operators need a number fact.
- Every tier must cost something (base `credits` above 0 or a meter with a rate above 0). At startup the app also prices every job each model can take (every option combination at every upload count; a free-text option, a string with no `enum`, counts only at its default, or left out when it has none) and refuses to start if any is priced at 0 or above 2147483647 credits, naming the model and the tier. A model with more than 10,000 such combinations is a startup error.
- A tier costs `credits` (default 0) plus, for each meter, `round(value / unitSize) x rate`. `round` is `ceil` (default), `floor`, `round` or `precise`.
- Supported units (`src/credits/units.ts`): `duration` (seconds) and `images` (count). A meter's `metric` must be a unit the model declares in `billing.units`. Adding a unit means editing that file.
- Credits are whole numbers: the tier total can be fractional and is rounded up once, at the end. A job reserves exactly what the estimate returns.

### POST /v1/credits/estimate/:plugin/:operation

Public. Body (strict): `{ "input": { "prompt": "waves", "duration": "10" }, "count": 1 }`. `input` is the same input `POST /v1/jobs/:plugin/:operation` takes and is checked the same way; `count` (1 to 20) defaults to 1. Upload ids in the image field are only counted, never looked up. An unknown plugin or operation returns `404 NOT_FOUND`; an unknown field, a bad value or too many uploads returns `422 VALIDATION_FAILED`. The `image` fact is true when the input has an upload, so with the example mapping above `"image": ["<upload id>"]` picks the "Image to video" tier.

```json
{
  "model": "kling21_generate",
  "count": 1,
  "tier": "Basic",
  "creditsPerJob": 60,
  "totalCredits": 60,
  "baseCredits": 0,
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

`baseCredits` is the chosen tier's `credits` (0 when it has none), and each `breakdown` item is one meter. `creditsPerJob` is `baseCredits` plus every breakdown item's `credits`, rounded up once, and `totalCredits` is `creditsPerJob × count`.

`GET /v1/models` shows `credits: { "min": 30, "max": 60 }` for each model instead of a single cost: the cheapest and the dearest job over every option combination and upload count. With the example mapping above, kling21 shows `{ "min": 30, "max": 75 }`, because a 10 s video from an image costs 5 + 10 × 7.

## Models and jobs

Models are laid out like jiraiya's prediction plugins: `src/models/plugins/<plugin>/<operation>/` holds an operation's `schema.ts` (its `info` and `input` fields), `requests.ts` (its fal calls), `billing.ts` and `index.ts`, and each plugin's `index.ts` lists its operations. `src/models/registry.ts` registers the plugins; at startup it checks every schema and that each operation's key is `<plugin>_<operation>` (for example `kling21_generate`). Jobs store that key as `model_key`, and `GET /v1/models` lists each model's `key`, `plugin`, `operation` and `input`.

`POST /v1/jobs/:plugin/:operation` takes `{ "input": { ... } }`, every field flat, for example:

```json
{ "input": { "prompt": "waves", "image": ["<upload id>"], "duration": "10" } }
```

The operation's `schema.input` checks every field by its own rules (an enum, a range, `maxLength`, `required`, a default), and rejects fields it doesn't declare. The prompt is a field like any other, and a model doesn't need one. The image field holds upload ids from `POST /v1/uploads`, up to its `maxItems`. An unknown plugin or operation returns `404 NOT_FOUND`; a bad input returns `422 VALIDATION_FAILED` with the issues in `meta`.

## Generation flow

```
client                API                         Cloud Tasks        worker                      fal
  | POST /v1/uploads   |                               |               |                         |
  |------------------->| signed upload URL             |               |                         |
  | PUT file to Storage (inputs bucket)                |               |                         |
  | POST /v1/jobs/...  |                               |               |                         |
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
  | (completed: outputs[].url, signed, 1 h)            |               |                         |
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
- The two models (`fluxSchnell/generate`, `kling21/generate`) are placeholders (`TODO(pricing)`): their fal input/output schemas and prices were not checked against fal's model pages. Check them, and the credit costs, before launch.

## Local end-to-end run

1. In `.env` set `TASKS_MODE=http` and `WORKER_URL=http://localhost:8081`, plus real `FAL_KEY` and `SUPABASE_*` values and the two buckets above. Nothing loads `.env` for you: in each terminal run `set -a; source .env; set +a` before starting a process.
2. Run the API and the worker side by side: `npm run dev:api` and `PORT=8081 npm run dev:worker` (separate terminals; the worker must listen on the port in `WORKER_URL`).
3. fal webhooks need a public `API_PUBLIC_URL` (for example an ngrok tunnel to port 8080). Without one, jobs stay `submitted`; about 3 minutes after submission call `curl -X POST localhost:8081/tasks/reconcile` and the reconciler polls fal and queues finalize.

## Cloud Tasks queues

| Queue          | Max attempts | Backoff       | Dispatch deadline |
| -------------- | ------------ | ------------- | ----------------- |
| `generation`   | 5            | 10 s to 5 min | 60 s              |
| `finalization` | 10           | 10 s to 5 min | 15 min            |

The worker service request timeout is 15 minutes (finalize copies files). Task names are deterministic per job and kind, so the same task is not queued twice.

## Milestone 2 acceptance check

Backend spec section 12. In a dev GCP/Supabase project, run one real image job and one real video job end to end (upload if the model needs one, `POST /v1/jobs/:plugin/:operation`, wait for `completed`, read `outputs[0].url` from the job, open the URL). Afterwards available credits have dropped by the cost and nothing is left reserved (check `GET /v1/me` and the job's rows in `app.credit_*`).

Also confirm against the real services, because these could not be tested locally:

- fal answers `queue.status` with a 4xx for a request id that belongs to another fal account (the `?jobId` linking path relies on it).
- fal's `X-Fal-Webhook-Request-Id` header equals the body's `request_id`. Otherwise every webhook gets 401 and jobs recover only through the reconciler's polling.
- fal re-signs a retried webhook with a fresh `X-Fal-Webhook-Timestamp`. Signatures more than 300 s from our clock are rejected, so a retry that kept the first timestamp would fail.
- Supabase Storage `info()` on a missing object reports "not found" (not an error).
- A streamed upload without `Content-Length` works.
- fal's real input and output shapes match the model files in `src/models/plugins/`.

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

`infra/setup.sh` creates both (see "Deploy to GCP").

## Deploy to GCP

`infra/setup.sh` deploys everything with `gcloud`. It is idempotent: it creates what is missing and updates what exists, so you run it again after any change.

1. Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), then `gcloud auth login`. You need Owner (or equivalent) on the GCP project, with billing enabled. Docker is not needed; Cloud Build builds the image.
2. Copy `infra/deploy.env.example` to `infra/deploy.env` (git-ignored) and fill it in. `GCP_REGION` should be the GCP region closest to your Supabase project's (Supabase uses AWS region codes). The two database URLs are different: `DATABASE_URL` is Supabase's transaction pooler (port 6543), `DATABASE_MIGRATION_URL` is the session pooler (port 5432, same pooler host). Do not use the `db.<ref>.supabase.co` host: it is IPv6-only and Cloud Run cannot reach it. Start `CORS_ORIGINS` as `http://localhost:3000` and leave `PADDLE_WEBHOOK_SECRET=pending` for the first run. Both example database URLs end with `?sslmode=no-verify`: the connection is encrypted but the server certificate is not verified. To verify it, download the CA certificate from Supabase (Database settings > SSL configuration), ship it in the image, and use `sslmode=verify-full&sslrootcert=<path>` (this needs a small image change, so it is not done by default).
3. Run `bash infra/setup.sh` (or `bash infra/setup.sh path/to/file.env`). It stops before touching GCP if a required value is empty, never prints secret values, and does not export them to child processes. Every `gcloud` command targets `GCP_PROJECT_ID` through `CLOUDSDK_CORE_PROJECT`; your gcloud config is not changed. `backend/.gcloudignore` keeps `.env`, `.env.*`, `.git`, `node_modules`, `dist`, `coverage`, `test`, `docker`, `docker-compose.yml` and `*.md` out of the Cloud Build upload.

What it creates, in order:

1. Enables the Run, Build, Artifact Registry, Tasks, Scheduler, Secret Manager and IAM APIs.
2. Artifact Registry repository `pixel-magic`.
3. The image, built from `backend/` and tagged with the git short SHA. Newer organisations give the default Cloud Build identity no roles, so the script finds it (`gcloud builds get-default-service-account`) and grants it `artifactregistry.writer` on the repository, `logging.logWriter` on the project and `storage.objectViewer` on the staging bucket `gs://<project>_cloudbuild` (created if missing). The Compute Engine API is enabled too, because that default identity is the Compute Engine default service account and only exists once the API is on; the script stops with a clear message if it is still missing. IAM grants can take a minute to apply, so the script retries the first build once after 60 s; if the build still fails with 403, run the script again.
4. Service accounts `api-sa`, `worker-sa`, `tasks-sa`, `scheduler-sa`; the six secrets in Secret Manager (a new version only when a value changed); `secretAccessor` on each secret for `api-sa` and `worker-sa` (the migration URL secret only for `worker-sa`, which runs the migrate job); `iam.serviceAccountUser` on `tasks-sa` for both.
5. Queues `generation` and `finalization`, with `cloudtasks.enqueuer` granted to `api-sa` and `worker-sa` on those two queues only.
6. Cloud Run job `pixel-magic-migrate`, executed and awaited: compiled migrations, then the catalog seed (`node dist/db/migrate.js && node dist/db/seeds/run.js`). The seed upserts by name, so it overwrites catalog fields with the seed file's values on every run; change a price by editing the seed and running the script again.
7. `pixel-magic-worker` (private, 15 min timeout, `worker-sa`). Only `tasks-sa` and `scheduler-sa` get `run.invoker` on it.
8. `pixel-magic-api` (public, `api-sa`). gcloud only warns if it cannot make the service public, so the script checks for `allUsers` with `roles/run.invoker` and stops with an error if missing. The usual cause is the organisation policy Domain Restricted Sharing (`iam.allowedPolicyMemberDomains`); allow `allUsers` for this project, then run again. After each deploy the script runs `update-traffic --to-latest` for the service.
9. A check that the service URLs match the ones given to the apps. The script computes `https://<service>-<projectNumber>.<region>.run.app` before deploying so `WORKER_URL` and `API_PUBLIC_URL` are right on the first deploy, then compares with `gcloud run services describe` and stops on a mismatch.
10. Scheduler jobs `pixel-magic-reconcile` (`*/5 * * * *`, `POST /tasks/reconcile`) and `pixel-magic-billing-sweep` (`0 * * * *`, `POST /tasks/billing-sweep`), both with an OIDC token for `scheduler-sa` and the worker URL as audience.
11. Prints the URLs and a checklist.

Settings chosen:

| Item                       | Choice                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generation` queue         | 5 attempts, backoff 10 s doubling up to 5 min, 10 concurrent dispatches. The handler itself fails a job after 5 attempts, so more would never run.                                                                                                                   |
| `finalization` queue       | 10 attempts, backoff 10 s doubling up to 5 min, 5 concurrent dispatches. Finalize returns 503 while fal is not finished or a copy fails; the reconciler also re-queues, so retries only need to bridge short gaps. Few concurrent copies limit memory and bandwidth. |
| API service                | 1 CPU, 512 Mi, concurrency 80, 0 to 10 instances, 300 s timeout. Raise `--min-instances` to 1 in `setup.sh` to avoid cold starts.                                                                                                                                    |
| Worker service             | 1 CPU, 1 Gi (it streams output files), concurrency 8, 0 to 5 instances, 900 s timeout.                                                                                                                                                                               |
| Migrate job                | 1 CPU, 512 Mi, no retries, 10 min timeout.                                                                                                                                                                                                                           |
| Database pool per instance | `DB_POOL_MAX=5`. Worst case is 50 API plus 25 worker connections through the transaction pooler.                                                                                                                                                                     |

### Paddle webhook

The first run uses the placeholder `PADDLE_WEBHOOK_SECRET=pending`, and the script warns about it at the end (webhooks are rejected until it is replaced). Flow: run the script once, then in Paddle go to Developer tools > Notifications and add a destination with the URL the script printed (`https://pixel-magic-api-<projectNumber>.<region>.run.app/webhooks/paddle`). Subscribe to `subscription.*` and `transaction.*`. Copy the destination's secret into `PADDLE_WEBHOOK_SECRET` in `infra/deploy.env` and run the script again.

### Roll back

Cloud Run keeps old revisions. Send traffic back to a good one (list them with `gcloud run revisions list --service pixel-magic-api --region <region>`):

```
gcloud run services update-traffic pixel-magic-api --region <region> --to-revisions <revision>=100
```

Do the same for `pixel-magic-worker`. Database migrations are not rolled back; write a new migration instead. After a rollback, new revisions get no traffic by themselves. Running `setup.sh` again (which is moving forward) deploys a new revision from the current code and runs `update-traffic --to-latest`, so it takes all traffic.

## Set up Supabase, Google and Vercel

Do this before the first deploy (Supabase) and after it (Vercel).

**Supabase**

1. Create the project in the region closest to `GCP_REGION` (Supabase uses AWS region codes).
2. Storage: create two private buckets, `inputs` and `outputs` (see "Supabase setup" above for limits).
3. Auth > Providers > Email: turn on "Confirm email".
4. Auth > Providers > Google: turn it on with a client ID and secret from a Google Cloud OAuth client (APIs & Services > Credentials > OAuth client ID, type Web application). Its authorized redirect URI is `https://<project>.supabase.co/auth/v1/callback`.
5. Auth > URL Configuration: set the Site URL, and add the redirect URLs `http://localhost:3000/auth/callback` and `https://<your-vercel-url>/auth/callback`.
6. Copy the keys: the secret key goes to `SUPABASE_SECRET_KEY` (backend, server only); the publishable key and project URL go to the frontend.
7. Dashboard > Connect: copy the transaction pooler (6543) and session pooler (5432) URLs into `deploy.env`.

**Vercel**

Create the project from `frontend/` and set three environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_API_URL` (the API URL printed by `setup.sh`). Then add the Vercel URL to `CORS_ORIGINS` in `infra/deploy.env`, run `setup.sh` again, and add the URL to Supabase's redirect list.

**Run locally end to end**

1. Backend: create `.env` from `.env.example` with real `FAL_KEY` and `SUPABASE_*` values (see "Local end-to-end run").
2. Start the database, then `npm run migrate` and `npm run seed`, then the API and worker (`npm run dev:api`, `PORT=8081 npm run dev:worker`).
3. Frontend: copy `frontend/.env.example` to `frontend/.env.local`, then `npm run dev` in `frontend/`.
