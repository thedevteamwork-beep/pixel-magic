# Pixel Magic backend — design

- **Date:** 2026-10-28
- **Status:** Draft. The outline was approved in chat on 2026-10-28; this full document is under review.
- **Code location:** `backend/` at the repo root, next to `frontend/`
- **Superseded in part (2026-11-01):** credits, plans and payments are now defined in [2026-11-01-plans-addons-design.md](2026-11-01-plans-addons-design.md). It replaces the wallet, the "roll over" rule, the price→credits map and the `subscriptions` table this document used to define. Where the two disagree, that document wins.

## 1. Intent

Pixel Magic is an AI image and video generation site. The Next.js frontend in `frontend/` is deployed on Vercel and is currently a static landing page. This backend lets a signed-in user:

- upload input files,
- start a generation on fal,
- pay for it with credits,
- download the result,
- buy plans and add-on credit packs through Paddle.

It implements the team's system architecture diagram (summarized in §3). It follows the conventions of the Pixelbin monorepo (`~/Desktop/Azure Repo/Pixelbin`) where they fit. The closest Pixelbin examples are `services/mangekyou` (queued AI jobs), `services/susanoo` (credits) and `services/jiraiya` (fal plugins).

**Why correctness matters more than features here.** Every fal request costs real money, and so does every credit a user buys. The backend must never:

- start a generation without first reserving credits,
- charge a user twice,
- charge for a failed job,
- leave credits stuck as reserved,
- lose a finished result.

Every caller can deliver the same request more than once: browsers that double-submit, Cloud Tasks, fal webhooks and Paddle webhooks. Every handler must therefore be safe to run twice.

## 2. Goals, non-goals, anti-goals

### Goals (v1)

1. The full generation flow, end to end, for one image model and one video model.
2. Credits are reserved when a job is created, captured when it succeeds and released when it fails. Every change is recorded in a ledger.
3. Plans and add-ons bought through Paddle grant credits (plans design).
4. Every entry point is idempotent.
5. The backend can be deployed to Cloud Run, with the setup steps scripted.

### Non-goals (v1)

- **Frontend screens.** Sign-in, the generation UI and billing pages come later. The backend only exposes the API.
- **An admin panel.** Operations are done through SQL or scripts.
- **AI providers other than fal.**
- **Sentry or any other error tracker.** This was the user's decision. Cloud Logging and Error Reporting are enough for now.
- **Redis and per-request rate limiting.** A per-user cap on active jobs is the abuse control instead.
- **User-initiated job cancellation, public sharing and galleries, and a job history list.** A history list is likely the next addition.
- **Automatic credit clawback on refunds or chargebacks.** The events are recorded and handled manually.

### Anti-goals (failure even if everything else works)

- A job reaches fal without credits reserved. Credit checks must **fail closed**.
- Credits are captured twice, captured for a failed job, or stay reserved forever.
- A webhook is acted on without verifying its signature.
- Any Pixel Magic table can be read or written through Supabase's public Data API using the anon or publishable key.
- A finished result is lost because fal's temporary media URL expired before we copied the file.
- Secrets end up in the repo or in logs.

## 3. Architecture (from the team's diagram)

```
Browser ─► Vercel (Next.js) ─► Supabase Auth            (sign-in; issues access token)
                           └─► Cloud Run API             (Bearer = Supabase access token)
Browser ─► Supabase Storage                              (direct upload / download via signed URLs)

Cloud Run API ─► Supabase Postgres   create upload/job records, reserve credits, record events, plans/payments
              ─► Supabase Storage    create signed upload/download URLs
              ─► Cloud Tasks         queue "generate" and "finalize" tasks
Cloud Tasks   ─► Cloud Run worker    POST /tasks/generate, /tasks/finalize
Cloud Run worker ─► fal              submit generation, fetch result
                 ─► Supabase Storage upload result
                 ─► Supabase Postgres complete+capture or fail+release
fal    ─► Cloud Run API              signed completion webhook
Paddle ─► Cloud Run API              signed payment webhook
Cloud Scheduler ─► Cloud Run worker  POST /tasks/reconcile (every 5 min)
```

There is **one codebase and one Docker image, deployed as two Cloud Run services**. `MODE=api` runs the public API and webhooks. `MODE=worker` runs the task handlers. `src/index.ts` chooses which one to start from `MODE`, the same way Pixelbin's `index.js` does.

## 4. Decisions

### 4.1 Made by the user

- Follow the architecture diagram: Vercel/Next.js, Supabase Auth, Postgres and Storage, a Cloud Run API and worker, Cloud Tasks, fal and Paddle.
- Use Pixelbin as the reference for conventions.
- **No Sentry for now.**
- ~~Credits come from a subscription, and unused credits roll over~~ (2026-10-28). **Replaced on 2026-11-01:** plan credits reset each period, the Pixelbin way, with configurable expiry, add-ons and carryover on plan changes. See the plans design §3.1.
- On 2026-10-28 the user approved the chat outline: stack, flow, credits, payments, auth, endpoints, tables and the order of work.

### 4.2 Proposed by Claude in the outline, accepted by the user ("rest is good")

| Decision | Reason |
|---|---|
| TypeScript on Node 22, Express | The frontend is TypeScript. Node 22 is Pixelbin's runtime. |
| Zod for validating requests and env | TypeScript-native; replaces Pixelbin's express-validator and Convict. |
| Winston JSON logs | Pixelbin standard. |
| Knex for queries and migrations | Pixelbin standard, without the Objection layer. |
| Vitest + supertest + Postgres in docker-compose | Pixelbin tests the same way against a real DB, but uses Jasmine. |
| No Redis in v1 | Cloud Tasks replaces BullMQ. |
| A periodic reconciler | Pixelbin's mangekyou has a similar recovery path. |
| One registry file per fal model | Pixelbin's jiraiya plugins work this way, and so does the frontend's widget registry. |

### 4.3 Claude's calls made while writing this document (for the user to check)

1. **Express 5.** It passes rejected promises to the error handler natively. Pixelbin uses Express 4.
2. **Pixel Magic tables live in a Postgres schema called `app`, not `public`.** Supabase's Data API exposes `public`. In addition, RLS is enabled on every table with no policies, and `anon` and `authenticated` get no privileges on `app`. Only the backend's direct DB connection can read or write.
3. **No foreign key to `auth.users`.** `profiles.id` equals the token's `sub` and is created on the user's first API call. This keeps tests on plain Postgres.
4. **A `submitting` job state with a lease.** This is the same idea as Pixelbin mangekyou's lease token. Without it, two deliveries of the same task could both submit to fal (§7.2).
5. **The fal webhook is acknowledged with `503` when the job isn't linked to its fal request yet.** fal can finish before the worker has saved the request ID, and fal retries the webhook with backoff (§7.3).
6. **Paddle webhooks are processed inline in one DB transaction rather than queued.** Paddle needs a `200` within 5 s, and this work is a few milliseconds of SQL. Move it to a queued task if it ever gets slow.
7. **The official `@fal-ai/client` SDK** instead of hand-written axios calls like Pixelbin's jiraiya uses.
8. **Prettier with 2-space indent and double quotes**, matching `frontend/`. Pixelbin's backends use 4 spaces.
9. **Error `code` is a stable SCREAMING_SNAKE string**, such as `INSUFFICIENT_CREDITS`, instead of Pixelbin's `UC-0422` style. The frontend can branch on it.
10. **Cloud Run IAM authenticates the worker routes.** The worker is deployed with `--no-allow-unauthenticated`, and only the tasks and scheduler service accounts get `roles/run.invoker`. The app does not verify those tokens a second time.
11. **Node 22 reaches end of life in April 2027.** We keep 22 to match Pixelbin. Moving to Node 24 later means changing `.nvmrc`, `engines` and the Docker base image.
12. **GitHub Actions runs lint, typecheck and tests on PRs that touch `backend/`.** Deploys in v1 are manual, using the setup script.
13. **Supabase anonymous users are rejected** (tokens with `is_anonymous: true`), because their tokens also carry `role=authenticated`. Email confirmation is enforced by turning on Supabase Auth's "Confirm email" setting, so unconfirmed users never get a session.
14. ~~Signup credits come from config (`SIGNUP_CREDITS`).~~ **Replaced:** every user starts on the Free plan (plans design §6.1).
15. **fal's safety checker is always on**, and users can't turn it off through `options`. Paddle's acceptable-use rules restrict adult content.
16. ~~Mid-cycle plan changes grant no credits.~~ **Replaced:** plan changes follow Pixelbin's timing and carry leftover credits over (plans design §6.2–§6.6). Paddle proration is never used, so `subscription_update` transactions are recorded only.
17. **Blocked outputs are refunded.** If fal's safety filter blocks every output of a job, the job fails with `CONTENT_BLOCKED` and its credits are released. fal's cost is ours. The active-job cap limits retry abuse.

## 5. Service layout

```
backend/
  src/
    index.ts                 # MODE=api | worker dispatch
    config.ts                # zod env schema; parse once at startup, exit on error
    logger.ts                # winston JSON, Cloud Logging fields
    api/
      server.ts              # express app: helmet, cors, json limits, routes, error handler
      routes/                # v1.ts (user routes), webhooks.ts, health.ts
      handlers/              # uploads, jobs, me, models, falWebhook, paddleWebhook
      middlewares/           # auth (Supabase JWT), validate (zod), errorHandler
    worker/
      server.ts
      tasks/                 # generate.ts, finalize.ts, reconcile.ts
    services/                # credits, jobs, uploads, storage, queue, payments
    clients/                 # fal.ts, supabaseStorage.ts, cloudTasks.ts, paddle.ts  (thin, injectable)
    models/                  # registry.ts + one file per fal model (e.g. imageModel.ts, videoModel.ts)
    db/
      knex.ts
      migrations/            # YYYYMMDDHHMMSS_description.ts
      repositories/          # SQL per table; the only place that writes SQL
    lib/                     # errors (AppError), ids, hashing
  test/                      # vitest; mirrors src/; fakes for clients/
  infra/setup.sh             # gcloud: services, SAs, queues, scheduler, secrets
  Dockerfile  docker-compose.yml  .env.example  .nvmrc  package.json  tsconfig.json
  eslint.config.mjs  .prettierrc  AGENTS.md  README.md
```

**Layering:** routes → handlers → services → repositories and clients. Handlers do HTTP work only. Services hold the business rules and own transactions. Clients wrap external SDKs behind small interfaces, so tests can inject fakes.

## 6. Data model (schema `app`)

All IDs are UUID v4 and all timestamps are `timestamptz`. Credits are integers.

**`profiles`**
- Columns: `id` (PK, = Supabase `sub`), `email`, `paddle_customer_id` (nullable, unique), `created_at`.
- Created with an upsert on the first authenticated request.
- The user's Free subscription and its credit grant are created in the same transaction (plans design §6.1).

**Credits, catalog and purchases:** `credit_grants`, `credit_allocations`, `credit_ledger`, `features`, `plans`, `plan_features`, `addons`, `addon_features`, `subscriptions`, `invoices` and `customer_addons` are defined in plans design §4. They replace the `credit_wallets`, `credit_ledger` and `subscriptions` tables this section used to define.

**`uploads`**
- Columns: `id`, `user_id`, `bucket`, `path`, `mime_type`, `size_bytes`, `status` (`pending|ready`), `created_at`.
- The path is `{user_id}/{upload_id}`.

**`jobs`**
- Core columns: `id`, `user_id`, `model_key`, `input` (jsonb: prompt and options), `upload_ids` (uuid[]), `credit_cost`, `status`.
- Idempotency columns: `idempotency_key`, `request_hash` (sha256 of the normalized request body).
- fal and lease columns: `fal_request_id` (unique, nullable), `lease_expires_at`, `attempts`.
- Result columns: `outputs` (jsonb array of `{bucket, path, mimeType}`), `error_code`, `error_message`.
- Timestamp columns: `created_at`, `submitted_at`, `completed_at`, `updated_at`.
- Unique: `(user_id, idempotency_key)`.
- Indexes: `(status, updated_at)` for the reconciler and `(user_id, created_at DESC)`.

**`provider_events`**
- Columns: `id`, `provider` (`fal`), `request_id`, `status`, `payload` (jsonb), `received_at`.
- Unique `(provider, request_id)`. This keeps an audit trail of each webhook received.

**`payment_events`**
- Columns: `id`, `paddle_event_id` (unique), `event_type`, `occurred_at`, `payload` (jsonb), `processed_at`, `created_at`.

Migrations are Knex TypeScript files in `src/db/migrations`. Each migration also applies the schema grants and RLS rules from §4.3 call 2. Migrations run over the direct (session) connection, `DATABASE_MIGRATION_URL`. The app uses Supabase's transaction pooler, `DATABASE_URL` on port 6543, with a small pool (max 5 per instance), because Cloud Run scales out horizontally.

## 7. Flows

### 7.1 Job states

```
queued ─► submitting ─► submitted ─► finalizing ─► completed
   └──────────┴─────────────┴────────────┴──────► failed   (releases credits)
```

Every state change is a compare-and-set: `UPDATE jobs SET … WHERE id = ? AND status = ? RETURNING *`. If no row comes back, another delivery already handled the job. The handler logs that and returns `200`.

`submitting` and `finalizing` carry a lease, `lease_expires_at`. A later delivery may take a job back from another worker only once that lease has expired.

### 7.2 Generation

1. **`POST /v1/uploads`**
   - The API validates the MIME type against an allowlist and the size against a limit.
   - It inserts a `pending` upload and returns a Supabase `createSignedUploadUrl` URL and token.
   - The browser uploads the file directly to Supabase.
   - The bucket's own `file_size_limit` and `allowed_mime_types` enforce the same limits on Supabase's side.
2. **`POST /v1/jobs/:plugin/:operation`** `{input}` (requires the `Idempotency-Key` header)
   1. Look up the operation in the registry (`404 NOT_FOUND` if the plugin or operation is unknown), then validate `input` against its `schema.input`: every field by its own rules, nothing undeclared. The image field holds upload ids.
   2. Check that each upload belongs to the user. Confirm the object exists in Storage, record its real size and MIME type, and mark the upload `ready`. Otherwise return `422 UPLOAD_NOT_READY`.
   3. In one transaction:
      - Upsert the profile (and the Free plan for a new user).
      - Look up an existing `(user_id, idempotency_key)`. If one exists with the same `request_hash`, return that job with `200`. If the hash differs, return `409 IDEMPOTENCY_KEY_REUSED`.
      - Count the user's active jobs. If there are too many, return `429 TOO_MANY_ACTIVE_JOBS` (default limit 4, configurable).
      - Insert the job as `queued`.
      - Reserve credits across the user's grants (plans design §5.3). If they aren't enough, roll back and return `402 INSUFFICIENT_CREDITS`.
   4. **After commit**, create a Cloud Task named `generate`. If enqueueing fails, log an error and still return `202`, because the reconciler re-queues stuck `queued` jobs.
   5. Respond `202 {jobId, status, creditCost}`.
3. **`/tasks/generate`** (worker)
   1. Claim the job: `queued → submitting`, or take back a `submitting` job whose lease has expired. Increment `attempts`.
   2. Create signed download URLs for the inputs, valid for 24 h so they outlast fal's queue.
   3. Call the model's `requestPrediction({ fal, input, webhook })` with `webhook = API_PUBLIC_URL + "/webhooks/fal?jobId=<id>"`. It picks the fal endpoint, builds the fal payload and submits it.
   4. Mark the job `submitting → submitted` and save `fal_request_id` and `submitted_at`.
   5. **When fal fails:**

      | Failure | Action |
      |---|---|
      | Retryable (429, 5xx, network) | Set `submitting → queued`, then return `503` so Cloud Tasks retries with backoff |
      | Not retryable (4xx), or `attempts >= 5` | Fail the job and release its credits, then return `200` |

   **Known risk:** if the worker crashes after fal accepts the request but before step 4, the retry submits again once the lease expires. fal is then paid twice, but the user is charged once. This is accepted for v1. Log it so it can be measured.
4. **`/webhooks/fal`** (API)
   1. Verify the signature, or return `401`:
      - **Keys:** ED25519 keys from `https://rest.fal.ai/.well-known/jwks.json`, cached for at most 24 h.
      - **Headers:** `X-Fal-Webhook-Request-Id`, `-User-Id`, `-Timestamp` and `-Signature`.
      - **Signed message:** `request_id \n user_id \n timestamp \n sha256hex(rawBody)`.
      - **Timestamp:** must be within ±300 s of now.
   2. Insert into `provider_events`, doing nothing if the row already exists.
   3. Look up the job by `fal_request_id`. If no job is linked yet, return `503` so fal retries. If the job is already terminal, return `200`.
   4. Queue a `finalize` task and return `200`. fal allows 15 s for the first attempt.
5. **`/tasks/finalize`** (worker)
   1. Claim the job: `submitted → finalizing`, with a lease.
   2. Ask fal for the status. If it isn't `COMPLETED`, set the job back to `submitted` and return `503` to retry.
   3. Fetch the result. Parse it into a list of media files with the model's `parseOutput`.
   4. Stream each file to Supabase Storage at `outputs/{user_id}/{job_id}/{index}.{ext}` with `upsert: true`, so a retry overwrites instead of duplicating.
   5. **If fal reports an error**, fail the job and release its credits.
   6. In one transaction:
      - Set the job `finalizing → completed`, with `outputs` and `completed_at`.
      - Capture the job's credit allocations (plans design §5.3).
6. **Results**
   - `GET /v1/jobs/:id` returns the job's status and, once it is `completed`, a fresh Supabase signed URL (valid 1 h) for each output. There is no separate download call.

**Fail and release** is a single transaction. It moves the job to `failed` with `error_code` and `error_message`, and releases the job's credit allocations. The compare-and-set on allocation status makes a second release a no-op (plans design §5.3).

### 7.3 Reconciler (`/tasks/reconcile`, Cloud Scheduler every 5 min)

Each run handles at most 100 jobs per bucket.

| Job state | Action |
|---|---|
| `queued` for more than 2 min | Re-queue `generate` |
| `submitting` or `finalizing` with an expired lease | Re-queue the matching task |
| `submitted` for more than 3 min | Ask fal for the status: `COMPLETED` or an error → queue `finalize`; still in fal's queue or running → leave it |
| `submitted` past the model's `timeoutMinutes` (default 60) | Cancel at fal, fail the job and release its credits |

This also covers webhooks that never arrived. fal stops retrying a webhook when its stored result expires: about 1 h, or about 6 min for results of 10 KB or more.

### 7.4 Cloud Tasks

**Queues**

| Queue | Max attempts | Backoff | Dispatch deadline |
|---|---|---|---|
| `generation` | 5 | 10 s → 5 min | 60 s |
| `finalization` | 10 | — | 15 min (video copies take a while) |

The worker's Cloud Run request timeout is 15 min.

**Task names**
- Name each task with a hash, `sha256("{kind}:{jobId}:{n}")`, so Cloud Tasks drops duplicates. `n` is 0 for the normal path. The reconciler uses `n` = the job's `attempts`, so a re-queue gets a new name.
- Treat `ALREADY_EXISTS` as success.
- Use hashed names because sequential names or prefixes make Cloud Tasks slower.

**Authentication:** each task carries an OIDC token for the tasks service account.

### 7.5 Payments (Paddle)

This section covers only verifying and recording webhooks. Checkout, routing, renewal, plan changes and add-ons are defined in plans design §6.

1. The backend creates the Paddle transaction, and the frontend opens Paddle.js with its `transactionId` (plans design §6.2).
2. **`/webhooks/paddle`** checks the signature with `paddle.webhooks.unmarshal(rawBody, PADDLE_WEBHOOK_SECRET, signatureHeader)`. The signature is HMAC-SHA256 over `ts:rawBody`, and it must be verified against the **raw** body; Pixelbin's susanoo gets this wrong. An invalid signature returns `401`.
3. In one transaction:
   1. Insert into `payment_events`, doing nothing on a duplicate `paddle_event_id`. If it was a duplicate, return `200`.
   2. Route the event as in plans design §6.3. Refunds and adjustments are recorded only (non-goal).
   3. Set `processed_at`.
4. Return `200` within Paddle's 5-second limit.

### 7.6 Auth

1. User routes require `Authorization: Bearer <Supabase access token>`.
2. The token is verified with `jose` using `createRemoteJWKSet("${SUPABASE_URL}/auth/v1/.well-known/jwks.json")`:
   - The issuer must be `${SUPABASE_URL}/auth/v1`.
   - The token must not be expired.
   - `sub` must be present.
   - `role` must be `authenticated`.
   - `is_anonymous` must not be `true` (§4.3 call 13).
3. If it fails, return `401 UNAUTHENTICATED`.

**The Supabase project must use asymmetric JWT signing keys.** That's the default for new projects. Legacy HS256 projects return no keys from JWKS and have to migrate first.

## 8. API contract

| Method | Path | Auth | Success | Notable errors |
|---|---|---|---|---|
| POST | `/v1/uploads` `{filename, mimeType, sizeBytes}` | user | `201 {uploadId, path, signedUrl, token, expiresAt}` | 422 |
| POST | `/v1/jobs/:plugin/:operation` `{input}` + `Idempotency-Key` | user | `202 {jobId, status, creditCost}`, or `200` on an idempotent replay | 402, 404, 409, 422, 429 |
| GET | `/v1/jobs/:id` | user (owner) | `200 {jobId, status, model, creditCost, createdAt, completedAt, outputs:[{index, mimeType, url, expiresAt}], error?}` (`outputs` is empty until `completed`) | 404 |
| GET | `/v1/me` | user | `200 {userId, email, credits:{available, reserved, grants}, subscription}` (plans design §7) | 401 |
| | `/v1/plans`, `/v1/addons`, `/v1/billing/*`, `/tasks/billing-sweep` | | Defined in plans design §7 | |
| GET | `/v1/models` | public | `200 [{key, plugin, operation, name, kind, category, description, credits:{min, max}, input}]` with `Cache-Control: public, max-age=300` | — |
| POST | `/v1/credits/estimate/:plugin/:operation` `{input, count?}` | public | `200 {model, count, tier, creditsPerJob, totalCredits, baseCredits, breakdown:[{unit, label, quantity, rate, credits}]}` | 422 |
| POST | `/webhooks/fal` | fal signature | `200` | 401, 503 |
| POST | `/webhooks/paddle` | Paddle signature | `200` | 401 |
| POST | `/tasks/generate`, `/tasks/finalize` `{jobId}` | Cloud Run IAM | `200` | 503 to retry |
| POST | `/tasks/reconcile` | Cloud Run IAM | `200 {counts}` | — |
| GET | `/_healthz`, `/_readyz` (the latter pings the DB) | none | `200` | 503 |

- **Error body:** `{ message, status, code, meta? }`.
  - Validation errors return `422 VALIDATION_FAILED`, with the Zod issues in `meta`.
  - Unknown errors return `500 INTERNAL` without exposing internals.
- **Other HTTP rules:**
  - CORS allows only the origins in `CORS_ORIGINS`.
  - JSON body limit is 100 KB.
  - Webhook routes read the raw body.
  - `helmet` is enabled.

## 9. Model registry

`src/models/registry.ts` maps a model `key` to a definition. Each model is a folder `src/models/<key>/`:

- `schema.ts`: `info` (name, kind, category, description), the `input` fields (`prompt`, at most one image, the options), `output` and `billing.units`. `metaSchema.ts` checks it strictly when the registry loads, so a typo stops the app. The strict options validator is generated from it.
- `requests.ts`: the model's own fal calls, `requestPrediction`, `checkPredictionStatus`, `getPredictionResult` and `cancelPrediction`, through the shared fal client, plus `parseOutput(falResult) → {outputs:[{url, mimeType}], blockedCount}`. The endpoint depends only on whether the job has an image, so the four calls always agree.
- `billing.ts`: `billingInputs({options, uploadCount})`, the facts a job is priced on: the options, the unit values (such as `duration` in seconds) and `image`.
- `index.ts`: the definition, with `timeoutMinutes`.

**Pricing.** `TIERED_CREDIT_MAPPING` (a default lives in `src/credits/defaultTieredCreditMapping.ts`) gives each model tiers, picked by conditions on the facts and priced as base credits plus metered units. `estimateCredits` prices a job for both `POST /v1/credits/estimate` and `POST /v1/jobs`, so the estimate is what is reserved. `GET /v1/models` shows `credits: {min, max}`, the cheapest and the dearest job over every option combination and upload count. The mapping is checked at startup, and every such job is priced then, so a mapping that prices a job outside 1 to 2147483647 credits stops the app. The backend README ("Credit pricing") has the details.

**Safety.** `requestPrediction` always turns on fal's safety checker, where the model has one. `parseOutput` reports a blocked output separately from a normal one, for example when `has_nsfw_concepts` is true, so `finalize` can apply the blocked-output rule (§4.3 call 17).

`GET /v1/models` returns only the public fields. Adding a model means adding one folder, one registry entry and one credit-mapping entry. The default mapping records fal's price for each model in a comment, so the credits can be checked against it.

**The v1 models and their credit costs are placeholders** until the user chooses them (§11).

## 10. Cross-cutting

- **Config.**
  - `src/config.ts` declares every environment variable in a Zod schema. The process exits at startup if any is invalid. This follows Pixelbin's rule of declaring every env var in config.
  - `.env.example` is committed with dummy values; `.env` is gitignored.
  - In production, secrets come from Secret Manager.
  - Variables: `MODE`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `STORAGE_BUCKET_INPUTS`, `STORAGE_BUCKET_OUTPUTS`, `FAL_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, plus the billing variables in plans design §8, `GCP_PROJECT_ID`, `GCP_REGION`, `TASKS_QUEUE_GENERATION`, `TASKS_QUEUE_FINALIZATION`, `TASKS_SERVICE_ACCOUNT`, `WORKER_URL`, `API_PUBLIC_URL`, `CORS_ORIGINS`, `MAX_ACTIVE_JOBS_PER_USER`, `UPLOAD_MAX_BYTES`.
- **Logging.**
  - Winston writes JSON to stdout with `severity`, `message`, `requestId` and `jobId`.
  - Errors include `stack`, which lets Cloud Error Reporting group them.
  - Never use `console.log`, and never log tokens, keys or signed URLs.
  - Log every job state change.
- **Testing.** Tests are written first, following Pixelbin's `AGENTS.md`.
  - Vitest and supertest run against Postgres 17 in docker-compose, with migrations applied.
  - The fal, Storage, Cloud Tasks and Paddle clients are replaced with in-memory fakes.
  - Supabase JWTs are signed with a local test key and served from a local JWKS.
  - Tests that must exist:
    - Concurrent reservations never overspend.
    - Idempotent replay and reused-key conflicts.
    - Duplicate task deliveries are no-ops.
    - Duplicate webhooks are no-ops.
    - A failure releases its credits exactly once.
    - Bad signatures are rejected.
    - A fal webhook that arrives before the job is linked returns `503`.
    - The reconciler handles each kind of stuck job.
- **Lint and format.** ESLint with typescript-eslint, plus Prettier (§4.3 call 8). `npm run lint`, `typecheck`, `test` and `migrate` must all pass in CI.
- **Docker.**
  - Multi-stage `node:22-alpine` build: `npm ci`, then `tsc`, then prune dev dependencies.
  - Runs as a non-root user with `CMD ["node", "dist/index.js"]`.
  - Reads `PORT` from the environment, as Cloud Run expects.
- **Infrastructure (`infra/setup.sh`, idempotent gcloud).**
  - Artifact Registry repository.
  - Two Cloud Run services:
    - `pixel-magic-api`: public, using `api-sa`.
    - `pixel-magic-worker`: private, using `worker-sa`, with a 15-min timeout.
  - `tasks-sa`, which has `run.invoker` on the worker. `api-sa` and `worker-sa` have `cloudtasks.enqueuer` and `iam.serviceAccountUser` on `tasks-sa`.
  - Two queues.
  - A Cloud Scheduler job that calls `/tasks/reconcile` using OIDC.
  - Secret Manager secrets.
  - Region: the same as the Supabase project.

## 11. Open questions for the user

Neither question changes the architecture, but both change what gets built in milestones 2–3.

1. **Launch models and prices.** Which fal image model and video model, and how many credits each costs. Until then, the builder uses one cheap image model and one short video model from fal's catalogue as placeholders, marked `TODO(pricing)`.
2. **The launch plan and add-on catalog** (plans design §11).

*Answered:* the credit rules (plans design §3.1) and blocked outputs being refunded (§4.3 call 17).

## 12. Milestones and acceptance

1. **Skeleton**
   - `backend/` scaffold: config, logger, Express 5 servers for both modes, health routes, error handler, auth middleware.
   - Knex setup with all §6 migrations, plus the `app` schema grants and RLS.
   - Dockerfile, docker-compose, lint, test, and CI.
   - *Done when:* `docker compose up` runs migrations, both modes boot, `/_readyz` is green, an authenticated `GET /v1/me` returns credits and a Free subscription, and CI passes.
2. **Generation**
   - Uploads, jobs, credits, Cloud Tasks, the worker tasks, the fal client, the registry with two models, the fal webhook, finalize, download URLs and the reconciler.
   - Credits are granted manually with a `npm run credits:grant -- <userId> <n> <days>` script.
   - *Done when:* every test in §10 passes, and in a dev GCP/Supabase project, a real image job and a real video job complete end to end. Afterwards, available credits have dropped by the cost, and nothing is left reserved.
3. **Plans and add-ons**
   - As defined in plans design §10.
4. **Deploy**
   - `infra/setup.sh`, plus README run and deploy docs.
   - *Done when:* both services and the scheduler are running in GCP, and the milestone 2 end-to-end test passes against the deployed services.

## 13. Left to the builder

- Library versions, internal names, how files are split inside each folder, and the test file layout.
- Exact numbers not fixed here: retry backoff for the finalization queue, the reconciler's batch size, and lease lengths. Use the defaults above unless there's a reason to change them.
- Which placeholder fal models to use until §11.1 is answered.

## 14. Pixelbin patterns deliberately not copied

| Pixelbin pattern | Why not |
|---|---|
| mangekyou's fail-open credit check (`CREDIT_CHECK_FAIL_OPEN`) | Anti-goal: the credit check must fail closed |
| jiraiya's optional webhook validation | Every webhook here is verified |
| susanoo's HMAC over re-serialized JSON | Signatures are checked against the raw body |
| Convict and express-validator | Replaced by Zod |
| Objection | Not used |
| BullMQ and Redis | Cloud Tasks replaces them |
| Helm/GKE and Azure Pipelines | Cloud Run and GitHub Actions instead |
