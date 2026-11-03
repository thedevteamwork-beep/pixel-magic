# Pixel Magic backend — Generation (milestone 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full generation flow: upload inputs, create a job that reserves credits, submit it to fal, receive fal's signed webhook, copy outputs into Supabase Storage, capture the credits on success or release them on failure, serve download links, and recover stuck jobs.

**Architecture:**
- The API creates the job and reserves credits in one transaction, then queues a Cloud Task.
- The worker's `generate` task submits the job to fal.
- fal's webhook (on the API) queues a `finalize` task. The worker's `finalize` task copies the outputs to Storage and captures the credits.
- A reconciler on Cloud Scheduler re-queues stuck jobs and polls fal when a webhook never arrives.
- fal, Supabase Storage and Cloud Tasks each sit behind an interface with an in-memory fake for tests.

**Tech Stack:** Existing backend (Node 22, TypeScript, Express 5, Zod 4, Knex + pg, Winston, Vitest + supertest), plus `@fal-ai/client`, `@supabase/supabase-js` and `@google-cloud/tasks`.

**Spec:**
- `docs/superpowers/specs/2026-10-28-backend-design.md`, the "backend spec": §4.3 calls 4, 5, 10, 15 and 17; §5; §6 (`uploads`, `jobs`, `provider_events`); §7.1–§7.4; §8; §9; §10; §12 milestone 2.
- Credits come from `docs/superpowers/specs/2026-11-01-plans-addons-design.md` §5.3, which is already built.
- Patterns are checked against Pixelbin's jiraiya and hidan (research summary in "Decisions this plan adds").

## Global Constraints

**Process and stack**
- **Branch:** create `feat/backend-generation` from `feat/backend-billing`, which isn't merged yet. Never work on `main`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Everything in `backend/AGENTS.md` applies:
  - layering routes → services → repositories / clients;
  - SQL only in `src/db/repositories/*`;
  - schema-qualified tables via `T`;
  - time from `deps.clock.now()`, passed into repositories, which write `created_at`/`updated_at` from it;
  - `AppError` codes;
  - ESM `.js` imports;
  - `npm run lint`, `npm run typecheck` and `npm test` must all pass before every commit.
- Run every npm command after `cd backend && source ~/.nvm/nvm.sh && nvm use`. Test Postgres is the running container `pm-verify-db` on port 54329 (don't run `npm run db:up`), and its `*_test` database is recreated by `test/setup/globalSetup.ts`.
- **New runtime dependencies:** only `@fal-ai/client`, `@supabase/supabase-js` and `@google-cloud/tasks`. Check each SDK's real method names and types in `node_modules` before using them. Tests never touch the network; they use the fakes in `test/fakes/`.

**Money and data rules**
- **One id everywhere.** `jobs.id` is the credit-allocation `job_id`, a storage path segment, part of the task name, and the `jobId` log field.
- **Credits:**
  - reserve only inside the job-creation transaction (`reserveCredits`);
  - capture only inside the transaction that marks the job `completed` (`captureCredits`);
  - release only through `failJob` (`releaseCredits`);
  - never call fal before the reservation has committed.
- **State changes** are compare-and-set (`UPDATE … WHERE id = ? AND status IN (…) RETURNING *`). Getting no row means another delivery already handled it: log at `info` and return 200. Log every state change at `info` with `jobId`, `from` and `to`.
- **Outputs** are copied into our Storage bucket before the job becomes `completed`. Users only ever receive Supabase signed URLs; never return fal URLs.
- **fal webhook** (backend spec §7.2.4): verify on the raw body.
  - ED25519 keys from `FAL_JWKS_URL` (default `https://rest.fal.ai/.well-known/jwks.json`), cached for at most 24 h.
  - Headers `X-Fal-Webhook-Request-Id`, `X-Fal-Webhook-User-Id`, `X-Fal-Webhook-Timestamp`, `X-Fal-Webhook-Signature` (hex).
  - Signed message `request_id\nuser_id\ntimestamp\nsha256hex(rawBody)`.
  - Timestamp within ±300 s.
- **Safety:** `buildInput` always enables fal's safety checker where the model has one. If every output is blocked, the job fails with `CONTENT_BLOCKED` and its credits are released (backend spec §4.3 call 17).

**Fixed values**

| Setting | Value |
|---|---|
| `MAX_ACTIVE_JOBS_PER_USER` | 4 |
| Generate lease | 2 min |
| Finalize lease | 15 min |
| Max submit attempts | 5 |
| Input signed URLs | 86400 s (24 h) |
| Download signed URLs | 3600 s |
| Upload signed URL lifetime reported | 2 h |
| Reconciler: `queued` | > 2 min |
| Reconciler: `submitted` poll | > 3 min |
| Reconciler: `submitted` timeout | the model's `timeoutMinutes` (default 60) |
| Reconciler batch | 100 rows per bucket |
| Output copy timeout | 10 min |

**New HTTP error codes** (added to `ErrorCode`):
- `UPLOAD_NOT_READY` (422)
- `IDEMPOTENCY_KEY_REUSED` (409)
- `TOO_MANY_ACTIVE_JOBS` (429)
- `JOB_NOT_COMPLETED` (409)

**Job error codes** (`jobs.error_code`, the `JobErrorCode` union in `src/db/rows.ts`): `SUBMIT_REJECTED`, `SUBMIT_FAILED`, `GENERATION_FAILED`, `CONTENT_BLOCKED`, `OUTPUT_INVALID`, `TIMED_OUT`, `MODEL_UNAVAILABLE`.

## Decisions this plan adds (beyond the spec)

1. **Reconciler task names get a time bucket.** A reconciler re-queue uses the suffix `r<attempts>-<floor(nowMs / 600000)>`, while the normal path uses `"0"`. The spec's `n = attempts` alone would reuse the same Cloud Tasks name forever for a `finalize` (attempts don't change after submit). Once a name has been used, Cloud Tasks rejects it again for about an hour, and the spec's suffix stays the same after that too. This version gives a new name at most every 10 minutes and still dedupes several reconciler passes within the same 10 minutes.
2. **`TASKS_MODE=http`** for local development. The worker routes are POSTed directly, without waiting for the response; Cloud Tasks is used only when `TASKS_MODE=cloud`.
3. **Each model adapter also counts blocked outputs** (`parseOutput` → `{ outputs, blockedCount }`). If some outputs are blocked but not all, the job completes with the remaining outputs and the full cost is captured, because fal charged for all of them.
4. **A model that has gone from the registry fails its in-flight jobs** with `MODEL_UNAVAILABLE` and releases their credits.
6. **Fewer double fal charges** (added 2026-11-03 at the user's request). Backend spec §7.2.3 accepts a double submit when the worker dies between fal accepting a request and the database saving its id. This plan narrows that window:
   - **The webhook URL carries our job id:** `${API_PUBLIC_URL}/webhooks/fal?jobId=<jobId>`, as jiraiya does. A webhook for an unsaved request then links itself to a job that's still `submitting`, so the retry doesn't submit again. Any other unmatched request is logged as an orphan.
   - **Saving the request id is retried** 3 times, 200 ms apart. If it still fails, the worker cancels that fal request before returning 503.
   - **When the save finds another request already linked** (a lost lease, or the webhook linked a different id), the worker cancels its own request as a duplicate.
   - **Orphan webhooks are logged** with `orphanFalRequest: true` and kept in `provider_events`, so they can be counted.
7. **Each model is a folder** (`src/models/<key>/index.ts`, `schema.ts`, `requests.ts`), following jiraiya's `predictionBackends/plugins/<model>/` layout. `schema.ts` holds the Zod options schema (also sent to the frontend as JSON Schema) and a Zod schema for fal's response, which `parseOutput` validates.
8. **"Make 4 videos" means 4 separate jobs** (4 requests, each with its own `Idempotency-Key`, up to `MAX_ACTIVE_JOBS_PER_USER`). An all-or-nothing `count` option is not built yet.
5. **From the jiraiya/hidan research:**
   - **Copied:** one id end to end; reserve when the job is admitted and release when it fails, including the case where it never started; copy outputs to our storage under fixed keys inside a retried step before marking success; one declarative adapter per model; polling (the reconciler) as the fallback when a webhook doesn't arrive.
   - **Not copied:**
     - unauthenticated webhooks;
     - a credit check that lets jobs through on errors;
     - billing events that can be lost;
     - a 1-minute output copy with no timeout;
     - a status endpoint that doesn't check the owner;
     - a row inserted after the provider call (hidan's race, where a fast webhook finds nothing).

## Review Focus

1. **A model disappears from the registry while its jobs are in flight.** The job fails with `MODEL_UNAVAILABLE` and the credits are released, in both `generate` and `finalize`. (Tests in Tasks 8 and 10.)
2. **The uploaded file isn't what was declared:** a different MIME type, or larger than the limit. Job creation checks Storage's real object info and answers `422 UPLOAD_NOT_READY` without reserving any credits. (Tasks 6 and 7.)
3. **Copying a large output fails or times out.** `finalize` returns 503 so it's retried, keeps the credits reserved, and never fails the job for a temporary storage error. (Task 10.)
4. **The same `Idempotency-Key` arrives twice at once,** from a double-click. There's exactly one job and one reservation, and every response carries the same `jobId`. (Task 7.)
5. **fal reports `COMPLETED` but there's no usable output:** an empty list or an unexpected shape. The job fails with `OUTPUT_INVALID`, credits are released, and nothing is captured. (Task 10.)

---

## File structure

```
backend/src/
  config.ts                         + generation env keys (Task 1)
  lib/errors.ts                     + 4 codes (Task 1)
  lib/hash.ts                       canonicalJson, sha256Hex (Task 7)
  deps.ts                           + storage, fal, falKeys, queue (Tasks 2–4)
  db/migrations/20261103000600_generation_constraints.ts   (Task 1)
  db/rows.ts                        + UploadRow, JobStatus, JobErrorCode, JobOutput (Task 1)
  db/repositories/uploads.repo.ts   (Task 6)
  db/repositories/jobs.repo.ts      (Tasks 7, 11)
  db/repositories/providerEvents.repo.ts (Task 9)
  clients/storage.ts                StorageClient + Supabase impl (Task 2)
  clients/fal.ts                    FalClient + SDK impl (Task 3)
  clients/falWebhook.ts             verifyFalWebhook, createFalKeySource, FalWebhookBody (Task 3)
  clients/tasks.ts                  TaskQueue + Cloud Tasks / http impls (Task 4)
  models/types.ts  models/registry.ts  (Task 5)
  models/flux-schnell/{index.ts,schema.ts,requests.ts}  models/kling-i2v/{index.ts,schema.ts,requests.ts} (Task 5)
  services/uploads.ts               createUpload, resolveUploads (Task 6)
  services/jobs/jobs.ts             createJob, failJob, jobView (Task 7)
  services/jobs/generate.ts         runGenerate (Task 8)
  services/jobs/falWebhook.ts       handleFalWebhook (Task 9)
  services/jobs/finalize.ts         runFinalize, getDownloadUrl (Task 10)
  services/jobs/reconcile.ts        runReconcile (Task 11)
  api/routes/models.ts uploads.ts jobs.ts  (Tasks 5, 6, 7, 10); webhooks.ts + /webhooks/fal (Task 9)
  worker/server.ts                  + /tasks/generate, /tasks/finalize, /tasks/reconcile (Tasks 8, 10, 11)
backend/test/
  fakes/storage.ts fal.ts tasks.ts  (Tasks 2–4)
  helpers/falWebhook.ts             (Task 3)
  fixtures/fal/*.json               (Task 5)
```

---

### Task 1: Config, error codes and job constraints

**Files:**
- Modify: `src/config.ts`, `src/lib/errors.ts`, `src/db/rows.ts`, `src/db/migrations/index.ts`, `.env.example`, `docker-compose.yml` (dummy values for the new required keys), `test/helpers/app.ts` (the config literal), `AGENTS.md` (error-code list)
- Create: `src/db/migrations/20261103000600_generation_constraints.ts`
- Test: `test/config.test.ts`, `test/db/constraints.test.ts`

**Interfaces:**
- Produces:
  - **New `Config` keys:**
    - required: `SUPABASE_SECRET_KEY`, `FAL_KEY`, `API_PUBLIC_URL`, `WORKER_URL`;
    - defaults: `STORAGE_BUCKET_INPUTS` (`"inputs"`), `STORAGE_BUCKET_OUTPUTS` (`"outputs"`), `FAL_JWKS_URL` (`"https://rest.fal.ai/.well-known/jwks.json"`), `TASKS_MODE` (`"http" | "cloud"`, default `"http"`), `TASKS_QUEUE_GENERATION` (`"generation"`), `TASKS_QUEUE_FINALIZATION` (`"finalization"`), `MAX_ACTIVE_JOBS_PER_USER` (4, ≥1), `UPLOAD_MAX_BYTES` (20971520, ≥1), `UPLOAD_MIME_TYPES` (`string[]`, default `"image/png,image/jpeg,image/webp"`, comma-split);
    - optional strings: `GCP_PROJECT_ID`, `GCP_REGION`, `TASKS_SERVICE_ACCOUNT`. All three are required when `TASKS_MODE === "cloud"`; `loadConfig` names each missing one.
  - **`ErrorCode`** gains `"UPLOAD_NOT_READY" | "IDEMPOTENCY_KEY_REUSED" | "TOO_MANY_ACTIVE_JOBS" | "JOB_NOT_COMPLETED"`.
  - **`rows.ts`:**
    - `JobStatus = "queued" | "submitting" | "submitted" | "finalizing" | "completed" | "failed"`;
    - `ACTIVE_JOB_STATUSES: JobStatus[]` = the first four;
    - `JobErrorCode` (the list in Global Constraints);
    - `JobOutput = { bucket: string; path: string; mimeType: string }`;
    - `JobRow` typed with `status: JobStatus`, `error_code: JobErrorCode | null` and `outputs: JobOutput[] | null`;
    - `UploadRow` (the columns of `app.uploads`).
  - **Migration 0600:**
    - `ALTER TABLE app.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (…six…))`;
    - `CREATE INDEX jobs_user_active ON app.jobs (user_id) WHERE status IN ('queued','submitting','submitted','finalizing')`;
    - `ALTER TABLE app.uploads ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()`;
    - `down` reverses all three.

- [ ] **Step 1: Branch and failing tests**

Run: `cd "/Users/tusharbansal/Desktop/pixel magic" && git checkout feat/backend-billing && git checkout -b feat/backend-generation`

```ts
// test/config.test.ts (add)
const gen = { SUPABASE_SECRET_KEY: "s", FAL_KEY: "f", API_PUBLIC_URL: "https://api.test", WORKER_URL: "https://worker.test" };
it("applies generation defaults", () => expect(loadConfig({ ...base, ...gen })).toMatchObject({
  STORAGE_BUCKET_INPUTS: "inputs", STORAGE_BUCKET_OUTPUTS: "outputs", TASKS_MODE: "http",
  MAX_ACTIVE_JOBS_PER_USER: 4, UPLOAD_MAX_BYTES: 20971520, UPLOAD_MIME_TYPES: ["image/png", "image/jpeg", "image/webp"],
  FAL_JWKS_URL: "https://rest.fal.ai/.well-known/jwks.json" }));
it("requires GCP settings in cloud mode", () =>
  expect(() => loadConfig({ ...base, ...gen, TASKS_MODE: "cloud" })).toThrow(/GCP_PROJECT_ID[\s\S]*GCP_REGION[\s\S]*TASKS_SERVICE_ACCOUNT/));
it("requires FAL_KEY", () => expect(() => loadConfig({ ...base, ...gen, FAL_KEY: undefined })).toThrow(/FAL_KEY/));

// test/db/constraints.test.ts (add)
it("rejects an unknown job status");   // insert job status "running" → code "23514"
```
(`base` is the existing fixture in config.test.ts. Every other test still passes, because `makeDeps` gets the new keys.)

- [ ] **Step 2:** Run `npm test -- test/config.test.ts test/db/constraints.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the config keys (including the cloud-mode check), the error codes, the row types, the migration (added to the static list in `migrations/index.ts`), and the config literal in `makeDeps`. Update `.env.example`, the compose dummy env and the `AGENTS.md` error-code list.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): config, error codes and job constraints`.

---

### Task 2: Storage client (Supabase) and fake

**Files:**
- Create: `src/clients/storage.ts`, `test/fakes/storage.ts`, `test/clients/storage.test.ts`
- Modify: `src/deps.ts`, `test/helpers/app.ts`, `package.json` (`@supabase/supabase-js`)

**Interfaces:**
- Produces:
  - `type StorageObjectInfo = { sizeBytes: number; mimeType: string }`.
  - `interface StorageClient`:
    - `createSignedUploadUrl(bucket: string, path: string): Promise<{ signedUrl: string; token: string }>`;
    - `getObjectInfo(bucket: string, path: string): Promise<StorageObjectInfo | null>` (null when the object doesn't exist);
    - `createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>`;
    - `copyFromUrl(bucket: string, path: string, sourceUrl: string, mimeType: string): Promise<void>`, which overwrites (`upsert: true`).
  - `class StorageError extends Error`. Every failure is wrapped in it.
  - `const STORAGE_COPY_TIMEOUT_MS = 600_000`.
  - `createSupabaseStorage(config: Config): StorageClient`:
    - `createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } })`;
    - `storage.from(bucket).createSignedUploadUrl(path)`;
    - `.info(path)` maps to `{ size, contentType }`, with "not found" → null (check the installed storage-js for the exact method and error shape);
    - `.createSignedUrl(path, s)`;
    - `copyFromUrl` = `fetch(sourceUrl, { signal: AbortSignal.timeout(STORAGE_COPY_TIMEOUT_MS) })`; a non-2xx response throws `StorageError`; otherwise `.upload(path, res.body, { contentType, upsert: true, duplex: "half" })`, so the body is streamed and never buffered.
  - `Deps` gains `storage: StorageClient`. `createDeps` uses `createSupabaseStorage(config)`.
  - `FakeStorage implements StorageClient`:
    - `objects: Map<string, StorageObjectInfo>`, keyed `` `${bucket}/${path}` ``;
    - `put(bucket, path, info)`;
    - `copies: Array<{ bucket; path; sourceUrl; mimeType }>`;
    - `failNext(method: keyof StorageClient, times = 1)`;
    - `calls`.
    - Signed URLs: `` `https://storage.test/${bucket}/${path}?mode=upload` `` for uploads and `` `…?mode=read&expires=${s}` `` for reads. Upload tokens are `"tok-" + path`.
    - `copyFromUrl` stores `{ sizeBytes: 1, mimeType }`.
  - `makeDeps` returns `storage: FakeStorage`.

- [ ] **Step 1: Failing tests** (`test/clients/storage.test.ts`, exercising the fake's contract that later tasks rely on)

```ts
it("returns null info for a missing object", async () => expect(await fake.getObjectInfo("inputs", "u/x")).toBeNull());
it("copyFromUrl stores the object and records the copy", async () => {
  await fake.copyFromUrl("outputs", "u/j/0.png", "https://fal.media/a.png", "image/png");
  expect(await fake.getObjectInfo("outputs", "u/j/0.png")).toEqual({ sizeBytes: 1, mimeType: "image/png" });
  expect(fake.copies).toHaveLength(1);
});
it("failNext makes the next call reject with StorageError", ...);
it("signed read URL carries the expiry", async () =>
  expect(await fake.createSignedUrl("outputs", "p", 3600)).toBe("https://storage.test/outputs/p?mode=read&expires=3600"));
```
- [ ] **Step 2:** Run `npm test -- test/clients/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `storage.ts` and the fake, and wire `deps.ts` and `makeDeps`.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): Supabase storage client and fake`.

---

### Task 3: fal client, webhook verification and fakes

**Files:**
- Create: `src/clients/fal.ts`, `src/clients/falWebhook.ts`, `test/fakes/fal.ts`, `test/helpers/falWebhook.ts`, `test/clients/falWebhook.test.ts`, `test/clients/fal.test.ts`
- Modify: `src/deps.ts`, `test/helpers/app.ts`, `package.json` (`@fal-ai/client`)

**Interfaces:**
- Produces:
  - **Types:**
    - `type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED"`;
    - `type FalResult = { ok: true; data: unknown } | { ok: false; message: string }`;
    - `class FalError extends Error { constructor(message: string, readonly retryable: boolean, readonly status?: number) }`.
  - **`interface FalClient`:**
    - `submit(modelId: string, input: Record<string, unknown>, webhookUrl: string): Promise<{ requestId: string }>`;
    - `status(modelId: string, requestId: string): Promise<FalStatus>`;
    - `result(modelId: string, requestId: string): Promise<FalResult>`;
    - `cancel(modelId: string, requestId: string): Promise<void>`.
  - **`createFalClient(config: Config): FalClient`** wraps the `@fal-ai/client` queue API (`queue.submit` with `webhookUrl`, `queue.status`, `queue.result`, `queue.cancel`; check the real names in the installed types).
    - Every call has a 30 s timeout (`FAL_TIMEOUT_MS = 30_000`).
    - Error mapping: 429, 5xx, network or timeout → `FalError(retryable: true)`; other 4xx → `FalError(retryable: false)`.
    - `result`: a 4xx/422 meaning "the request failed" → `{ ok: false, message }`; 5xx → throws a retryable `FalError`.
  - **`falWebhook.ts`:**
    - `type FalWebhookHeaders = { requestId?: string; userId?: string; timestamp?: string; signature?: string }`;
    - `type FalPublicKeys = () => Promise<KeyObject[]>`;
    - `createFalKeySource(jwksUrl: string, clock: Clock, fetchFn: typeof fetch = fetch): FalPublicKeys`: fetches `{ keys: [{ kty: "OKP", crv: "Ed25519", x }] }`, turns each key into a `KeyObject` with `crypto.createPublicKey({ key, format: "jwk" })`, and caches for 24 h by the clock. If a refresh fails while an old cache exists, it keeps the old cache and logs nothing (the caller logs).
    - `verifyFalWebhook(p: { headers: FalWebhookHeaders; rawBody: Buffer; now: Date; keys: FalPublicKeys }): Promise<boolean>`: true if any key verifies `crypto.verify(null, Buffer.from(message), key, Buffer.from(signature, "hex"))` and `|now − timestamp×1000| ≤ 300_000`. Anything missing or malformed → false.
    - `FalWebhookBody = z.object({ request_id: z.string(), status: z.enum(["OK", "ERROR"]), payload: z.unknown().optional(), error: z.string().nullish() })`.
  - **`Deps`** gains `fal: FalClient` and `falKeys: FalPublicKeys` (`createFalKeySource(FAL_JWKS_URL, clock)`).
  - **`FakeFal implements FalClient`:**
    - `calls`;
    - `submit` returns `req_1`, `req_2`, …;
    - `statuses: Map<string, FalStatus>` (default `"IN_PROGRESS"`);
    - `results: Map<string, FalResult>`;
    - `failNext(method, error: FalError, times = 1)`.
  - **Test helper `test/helpers/falWebhook.ts`:** builds an Ed25519 key pair once.
    - `testFalKeys: FalPublicKeys`;
    - `signFalWebhook(body: object, opts?: { requestId?: string; timestamp?: number; key?: "test" | "other" }): { raw: Buffer; headers: Record<string, string> }`, with `userId` "fal-user".
    - `makeDeps` sets `falKeys: testFalKeys` and returns `fal: FakeFal`.

- [ ] **Step 1: Failing tests**

```ts
// test/clients/falWebhook.test.ts — `now` = the timestamp used to sign
it("accepts a correctly signed webhook", async () => expect(await verifyFalWebhook({ ...signed, now, keys: testFalKeys })).toBe(true));
it.each([["other key", { key: "other" }], ["tampered body", "tamper"], ["301 s old", { timestamp: nowSec - 301 }]])
  ("rejects %s", ...);                                       // → false
it("rejects when a header is missing", ...);                 // → false
it("caches keys for 24 h", async () => {                     // fetchFn counts calls: 2 calls within 24 h → 1 fetch; +24 h 1 s → 2 fetches
});
it("keeps the cached keys when a refresh fails", ...);
// test/clients/fal.test.ts — the error mapping, unit-tested with a stubbed SDK (pass the SDK client in via an optional parameter)
it.each([[429, true], [503, true], [400, false], [422, false]])("maps submit HTTP %i to retryable=%s", ...);
it("maps a failed result to { ok: false, message }", ...);
```
- [ ] **Step 2:** Run `npm test -- test/clients/falWebhook.test.ts test/clients/fal.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both modules, the fakes and the helper, and wire `deps`. Give `createFalClient` an optional second parameter for the SDK client, so the tests can stub it.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): fal client and signed webhook verification`.

---

### Task 4: Task queue (Cloud Tasks and local http) and fake

**Files:**
- Create: `src/clients/tasks.ts`, `test/fakes/tasks.ts`, `test/clients/tasks.test.ts`
- Modify: `src/deps.ts`, `test/helpers/app.ts`, `package.json` (`@google-cloud/tasks`)

**Interfaces:**
- Produces:
  - `type TaskKind = "generate" | "finalize"`.
  - `interface TaskQueue { enqueue(kind: TaskKind, jobId: string, suffix: string): Promise<void> }`. A name that already exists counts as success.
  - `taskName(kind: TaskKind, jobId: string, suffix: string): string` = sha256 hex of `` `${kind}:${jobId}:${suffix}` `` (hashed, per backend spec §7.4).
  - `createCloudTasksQueue(config: Config, client = new CloudTasksClient()): TaskQueue`:
    - queue `TASKS_QUEUE_GENERATION` for `generate` and `TASKS_QUEUE_FINALIZATION` for `finalize`;
    - `task.name = client.taskPath(GCP_PROJECT_ID, GCP_REGION, queue, taskName(...))`;
    - `httpRequest: { httpMethod: "POST", url: `${WORKER_URL}/tasks/${kind}`, headers: { "Content-Type": "application/json" }, body: base64(JSON {jobId}), oidcToken: { serviceAccountEmail: TASKS_SERVICE_ACCOUNT, audience: WORKER_URL } }`;
    - `dispatchDeadline` is 60 s for generate and 900 s for finalize;
    - gRPC code 6 (`ALREADY_EXISTS`) → resolve.
  - `createHttpQueue(config: Config, logger): TaskQueue`: POSTs to `${WORKER_URL}/tasks/${kind}` without awaiting the response (failures logged at WARN). It remembers names it already sent for 1 h and skips them.
  - `createTaskQueue(config, logger)` picks by `TASKS_MODE`.
  - `Deps` gains `queue: TaskQueue`.
  - `FakeQueue implements TaskQueue`: `tasks: Array<{ kind; jobId; suffix; name }>`, which drops a duplicate name; `failNext(times = 1)`.
  - `makeDeps` returns `queue: FakeQueue`.

- [ ] **Step 1: Failing tests**

```ts
it("task names are stable and differ by suffix", () => { expect(taskName("generate", J, "0")).toBe(taskName("generate", J, "0")); expect(taskName("generate", J, "0")).not.toBe(taskName("generate", J, "r1-5")); });
it("builds the Cloud Tasks request", async () => {   // stub client captures createTask args
  expect(args.parent).toBe(stub.queuePath("p", "r", "finalization"));
  expect(args.task.httpRequest).toMatchObject({ httpMethod: "POST", url: "https://worker.test/tasks/finalize",
    oidcToken: { serviceAccountEmail: "tasks@p.iam.gserviceaccount.com", audience: "https://worker.test" } });
  expect(JSON.parse(Buffer.from(args.task.httpRequest.body, "base64").toString())).toEqual({ jobId: J });
  expect(args.task.dispatchDeadline).toEqual({ seconds: 900 });
});
it("treats ALREADY_EXISTS as success and rethrows other errors", ...);
it("FakeQueue drops a duplicate name", ...);
```
- [ ] **Step 2:** Run `npm test -- test/clients/tasks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, and wire `deps`.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): Cloud Tasks queue, local http queue and fake`.

---

### Task 5: Model registry and `GET /v1/models`

**Files:**
- Create: `src/models/types.ts`, `src/models/registry.ts`, `src/api/routes/models.ts`, `test/fixtures/fal/flux-schnell.json`, `test/fixtures/fal/kling-i2v.json`, `test/models/models.test.ts`, `test/api/models.test.ts`
- Create one folder per model (Decision 7). Each holds three files:
  - `index.ts`: the `ModelDefinition` (key, falModelId, kind, displayName, prompt/uploads rules, creditCost, timeoutMinutes), wired to the other two files;
  - `schema.ts`: `optionsSchema` (Zod object, all fields defaulted) and `falOutputSchema` (Zod schema for fal's result);
  - `requests.ts`: `buildInput` and `parseOutput`. `parseOutput` runs `falOutputSchema.safeParse` and throws `OutputInvalidError` on a mismatch.

  The folders are `src/models/flux-schnell/{index,schema,requests}.ts` and `src/models/kling-i2v/{index,schema,requests}.ts`. `registry.ts` imports each folder's `index.ts` into a static list.
- Modify: `src/api/server.ts`

**Interfaces:**
- Produces:
  - `type ModelKind = "image" | "video"`.
  - `type ParsedOutput = { outputs: { url: string; mimeType: string }[]; blockedCount: number }`.
  - `class OutputInvalidError extends Error`.
  - `type ModelDefinition<O extends z.ZodObject = z.ZodObject> = { key: string; falModelId: string; kind: ModelKind; displayName: string; prompt: { required: boolean; maxLength: number }; uploads: { min: number; max: number }; options: O; creditCost(o: z.output<O>): number; buildInput(p: { prompt: string; options: z.output<O>; inputUrls: string[] }): Record<string, unknown>; parseOutput(data: unknown): ParsedOutput; timeoutMinutes: number }`. Every field in `options` has a default, so `options.parse({})` works.
  - `getModel(key: string): ModelDefinition | undefined` and `listModels(): ModelDefinition[]`.
  - `publicModel(m): { key, name, kind, creditCost, prompt, uploads, options }`:
    - `creditCost` = `m.creditCost(m.options.parse({}))`;
    - `options` = `z.toJSONSchema(m.options)`.
  - **Placeholder models**, both marked `// TODO(pricing)`, each with fal's price in a comment. Check each schema against the model's fal page.

    | Key | `falModelId` | Kind | Prompt | Uploads | Options | `creditCost` | `timeoutMinutes` |
    |---|---|---|---|---|---|---|---|
    | `flux-schnell` | `fal-ai/flux/schnell` | image | required, ≤ 2000 | 0–0 | `image_size` enum `square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9` (default `landscape_4_3`); `num_images` int 1–4 (default 1) | `num_images` × 1 | 10 |
    | `kling-i2v` | `fal-ai/kling-video/v2.1/standard/image-to-video` | video | required, ≤ 2500 | 1–1 | `duration` enum `"5"`, `"10"` (default `"5"`) | `"5"` → 10, `"10"` → 20 | 60 |

    - `flux-schnell`: `buildInput` → `{ prompt, image_size, num_images, enable_safety_checker: true }`. `parseOutput` uses `data.images[i].{url, content_type}` and drops index `i` when `data.has_nsfw_concepts[i] === true`, counting it as blocked.
    - `kling-i2v`: `buildInput` → `{ prompt, image_url: inputUrls[0], duration }`. `parseOutput` → `[{ url: data.video.url, mimeType: data.video.content_type ?? "video/mp4" }]`, `blockedCount` 0.
  - **Route:** `GET /v1/models` is public, returns `200 publicModel[]` with `Cache-Control: public, max-age=300`.

- [ ] **Step 1: Failing tests**

```ts
// test/models/models.test.ts
it("flux buildInput always turns the safety checker on", () => expect(flux.buildInput({ prompt: "a cat", options: flux.options.parse({}), inputUrls: [] }))
  .toEqual({ prompt: "a cat", image_size: "landscape_4_3", num_images: 1, enable_safety_checker: true }));
it("flux parseOutput drops NSFW images", () => expect(flux.parseOutput(fixture("flux-schnell")))   // fixture: 2 images, has_nsfw_concepts [false, true]
  .toEqual({ outputs: [{ url: "https://fal.media/files/a.jpg", mimeType: "image/jpeg" }], blockedCount: 1 }));
it("parseOutput throws OutputInvalidError on an unexpected shape", () => expect(() => flux.parseOutput({ foo: 1 })).toThrow(OutputInvalidError));
it("kling parses the video", ...);   it("credit costs", () => { expect(flux.creditCost({ image_size: "square", num_images: 3 })).toBe(3); expect(kling.creditCost({ duration: "10" })).toBe(20); });
// test/api/models.test.ts
it("GET /v1/models lists public fields with a cache header", ...);   // keys ["flux-schnell","kling-i2v"]; creditCost 1 and 10; Cache-Control "public, max-age=300"; no falModelId in the body
```
- [ ] **Step 2:** Run `npm test -- test/models test/api/models.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the types, the two models, the registry and the route.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): model registry with placeholder image and video models`.

---

### Task 6: Uploads

**Files:**
- Create: `src/db/repositories/uploads.repo.ts`, `src/services/uploads.ts`, `src/api/routes/uploads.ts`, `test/api/uploads.test.ts`, `test/services/uploads.test.ts`
- Modify: `src/api/server.ts`

**Interfaces:**
- Consumes: Task 2 `StorageClient`; `requireUser`, `ensureUser` and `validate`.
- Produces:
  - **`uploads.repo.ts`:**
    - `insertUpload(db, p: { id: string; user_id: string; bucket: string; path: string; mime_type: string; size_bytes: number; now: Date }): Promise<UploadRow>`;
    - `getUserUploads(db, userId: string, ids: string[]): Promise<UploadRow[]>`;
    - `markUploadReady(db, id: string, p: { mime_type: string; size_bytes: number; now: Date }): Promise<void>`.
  - **`createUpload(deps, userId: string, body: { filename: string; mimeType: string; sizeBytes: number }): Promise<{ uploadId: string; path: string; signedUrl: string; token: string; expiresAt: Date }>`:**
    - `uploadId = crypto.randomUUID()`;
    - `path` = `` `${userId}/${uploadId}` ``;
    - bucket `STORAGE_BUCKET_INPUTS`;
    - a `mimeType` not in `UPLOAD_MIME_TYPES`, or `sizeBytes` outside 1–`UPLOAD_MAX_BYTES` → `AppError(422, "VALIDATION_FAILED", …)`;
    - the signed upload URL is created before the row is inserted;
    - `expiresAt` = now + 2 h.
  - **`resolveUploads(deps, userId: string, ids: string[]): Promise<UploadRow[]>`:**
    - results come back in request order;
    - duplicate ids → 422 `VALIDATION_FAILED`;
    - an id not owned by the user, missing from Storage, with a real MIME type outside the allowlist, or a real size over `UPLOAD_MAX_BYTES` → `AppError(422, "UPLOAD_NOT_READY", …, { uploadId, reason: "not_found" | "not_uploaded" | "mime_type" | "too_large" })`;
    - otherwise `markUploadReady` with Storage's real values.
  - **Route:** `POST /v1/uploads` (`requireUser` → `ensureUser`; body `{ filename: string 1–255, mimeType: string, sizeBytes: int }`) → `201 { uploadId, path, signedUrl, token, expiresAt }`.

- [ ] **Step 1: Failing tests**

```ts
// test/api/uploads.test.ts
it("creates a pending upload and a signed upload URL", ...);   // 201; path `${userId}/${uploadId}`; signedUrl ".../inputs/<path>?mode=upload"; row status "pending", bucket "inputs"
it.each([["application/pdf", 10], ["image/png", 20971521], ["image/png", 0]])("rejects %s / %i bytes with 422", ...);
// test/services/uploads.test.ts
it("resolveUploads marks ready with Storage's real size and type", ...);       // FakeStorage.put(... {sizeBytes: 1234, mimeType: "image/png"}) → row ready, size 1234
it("rejects an upload that isn't in Storage yet", ...);                          // 422 UPLOAD_NOT_READY reason "not_uploaded"
it("rejects when the real object differs from what was declared", ...);           // Review Focus 2: declared image/png, real application/pdf → reason "mime_type"; real 30 MB → "too_large"
it("rejects another user's upload as not_found", ...);  it("rejects duplicate ids", ...);  it("keeps request order", ...);
```
- [ ] **Step 2:** Run `npm test -- test/api/uploads.test.ts test/services/uploads.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the repository, service and route.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): signed uploads and upload verification`.

---

### Task 7: Job creation, job view and `failJob`

**Files:**
- Create: `src/lib/hash.ts`, `src/db/repositories/jobs.repo.ts`, `src/services/jobs/jobs.ts`, `src/api/routes/jobs.ts`, `test/api/jobs.create.test.ts`, `test/services/jobs/failJob.test.ts`
- Modify: `src/api/server.ts`, `test/helpers/factories.ts` (add `createFundedUser(deps, credits = 100)`, which creates a user on Free plus a `manual` grant of `credits`)

**Interfaces:**
- Consumes:
  - Task 5 `getModel`;
  - Task 6 `resolveUploads`;
  - Task 4 `TaskQueue`;
  - `lockProfile(trx, userId)`;
  - `reserveCredits(trx, { userId, jobId, amount, now })` (402 `INSUFFICIENT_CREDITS` when short);
  - `releaseCredits(trx, jobId)`.
- Produces:
  - **`hash.ts`:** `canonicalJson(v: unknown): string` (object keys sorted recursively; array order kept) and `sha256Hex(s: string | Buffer): string`.
  - **`jobs.repo.ts`:**
    - `insertJob(trx, j: NewJob): Promise<JobRow | null>`, using `ON CONFLICT (user_id, idempotency_key) DO NOTHING RETURNING *`. `NewJob` = `{ user_id, model_key, input, upload_ids, credit_cost, idempotency_key, request_hash, now }`, with status `queued`.
    - `getJobByIdempotencyKey(db, userId, key)`, `getJob(db, id)`, `getUserJob(db, userId, id)`, `getJobByFalRequestId(db, requestId)` and `countActiveJobs(db, userId)`.
    - `transitionJob(db, id: string, from: JobStatus[], patch: Partial<JobRow> & { status: JobStatus }, now: Date): Promise<JobRow | null>`, a compare-and-set that always sets `updated_at = now`.
    - `claimJob(db, id: string, p: { from: JobStatus; orExpiredLease: JobStatus; to: JobStatus; leaseUntil: Date; now: Date; incrementAttempts: boolean }): Promise<JobRow | null>`: `WHERE id = ? AND (status = from OR (status = orExpiredLease AND lease_expires_at < now))`.
  - **`type JobView = { jobId; status; model; creditCost; createdAt; completedAt; outputs: { index: number; mimeType: string }[]; error?: { code: JobErrorCode; message: string } }`** and **`jobView(job: JobRow): JobView`**. These never expose a bucket, path or fal id.
  - **`createJob(deps, userId: string, body: { model: string; prompt: string; uploadIds: string[]; options: Record<string, unknown> }, idempotencyKey: string): Promise<{ status: 200 | 202; job: JobView }>`:**
    1. Unknown model → `422 VALIDATION_FAILED` "Unknown model". Options are parsed with the model's schema (a ZodError becomes 422). The prompt must be non-empty when required, and within `maxLength`. The number of `uploadIds` must be within the model's `uploads.min`–`uploads.max`.
    2. `resolveUploads`, outside the transaction.
    3. `request_hash = sha256Hex(canonicalJson({ model, prompt, uploadIds, options }))`, using the parsed options.
    4. In one transaction:
       - `lockProfile`;
       - an existing job with the same key and the same hash → `{200, view}`; a different hash → `409 IDEMPOTENCY_KEY_REUSED`;
       - `countActiveJobs ≥ MAX_ACTIVE_JOBS_PER_USER` → `429 TOO_MANY_ACTIVE_JOBS`;
       - `insertJob` with input `{ prompt, options }`;
       - `reserveCredits` with `credit_cost`.
    5. After commit: `queue.enqueue("generate", jobId, "0")`. If that fails, log an ERROR with `jobId` and still return 202 (the reconciler re-queues it).
    6. Return `{202, view}`.
  - **`failJob(trx, deps, jobId: string, from: JobStatus[], code: JobErrorCode, message: string): Promise<boolean>`:** a compare-and-set to `failed` with `error_code`, `error_message` (first 500 characters), `completed_at = now` and `lease_expires_at = null`. If the change applied → `releaseCredits(trx, jobId)` and a WARN log `{ jobId, code }`. Returns whether it applied.
  - **Routes:**
    - `POST /v1/jobs` (`requireUser` → `ensureUser`). The `Idempotency-Key` header is required, 1–200 characters, else 422. Body `{ model: string; prompt?: string = ""; uploadIds?: uuid[] (≤ 10) = []; options?: object = {} }`. Responds with `createJob`'s status and body.
    - `GET /v1/jobs/:id` → the owner gets `200 JobView`; anyone else, or a non-UUID id → 404 `NOT_FOUND`.

- [ ] **Step 1: Failing tests**

```ts
// test/api/jobs.create.test.ts — user funded with 100 credits; Idempotency-Key "k1"
it("creates a queued job, reserves its cost and queues generate", async () => {
  expect(res.status).toBe(202); expect(res.body).toMatchObject({ status: "queued", creditCost: 1, model: "flux-schnell" });
  expect(await reservedFor(res.body.jobId)).toBe(1);
  expect(queue.tasks).toEqual([expect.objectContaining({ kind: "generate", jobId: res.body.jobId, suffix: "0" })]);
});
it("replays the same key and body with 200 and no second reservation", ...);
it("rejects the same key with a different body with 409 IDEMPOTENCY_KEY_REUSED", ...);
it("five concurrent requests with one key make one job", ...);   // Review Focus 4: Promise.all ×5 → all the same jobId; 1 job row; reserved total = cost
it("returns 402 INSUFFICIENT_CREDITS and creates no job when short", ...);
it("returns 429 TOO_MANY_ACTIVE_JOBS on the fifth active job", ...);
it.each(["unknown model", "bad option", "missing prompt", "too many uploads", "missing Idempotency-Key"])("422 for %s", ...);
it("rejects an undeclared upload object with 422 UPLOAD_NOT_READY and reserves nothing", ...);   // Review Focus 2 end to end
it("still answers 202 when queueing fails, and logs ERROR", ...);
it("GET /v1/jobs/:id shows the owner's job without internals; others get 404", ...);
// test/services/jobs/failJob.test.ts
it("fails a job and releases its credits exactly once", ...);   // second failJob → false; grant reserved back to 0 once
```
- [ ] **Step 2:** Run `npm test -- test/api/jobs.create.test.ts test/services/jobs/failJob.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the hash helpers, the repository, the service, the routes and the factory.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): job creation with idempotency, active-job cap and credit reservation`.

---

### Task 8: Worker `generate` task

**Files:**
- Create: `src/services/jobs/generate.ts`, `test/services/jobs/generate.test.ts`
- Modify: `src/worker/server.ts` (`POST /tasks/generate`, using `express.json`; body `{ jobId: uuid }`, an invalid body → 422)

**Interfaces:**
- Consumes: `claimJob`, `transitionJob`, `failJob`, `getModel`, `getUserUploads`, `StorageClient.createSignedUrl`, `FalClient.submit` and `FalError`.
- Produces:
  - `const GENERATE_LEASE_MS = 120_000`, `const MAX_SUBMIT_ATTEMPTS = 5`, `const SAVE_REQUEST_ID_ATTEMPTS = 3` and `const SAVE_REQUEST_ID_DELAY_MS = 200`.
  - `falWebhookUrl(config, jobId: string): string` = `` `${API_PUBLIC_URL}/webhooks/fal?jobId=${jobId}` `` (Decision 6).
  - **`runGenerate(deps, jobId: string): Promise<200 | 503>`:**
    1. Claim: `claimJob({ from: "queued", orExpiredLease: "submitting", to: "submitting", leaseUntil: now + 2 min, incrementAttempts: true })`. Null → 200.
    2. The model is gone → `failJob(["submitting"], "MODEL_UNAVAILABLE")` → 200.
    3. Input URLs: one `createSignedUrl(STORAGE_BUCKET_INPUTS, upload.path, 86400)` per `upload_ids`, in order.
    4. `fal.submit(model.falModelId, model.buildInput({ prompt, options, inputUrls }), falWebhookUrl(config, jobId))`.
    5. **Save the request id** with `transitionJob(["submitting"] → "submitted", { fal_request_id, submitted_at: now, lease_expires_at: null })`. If the call **throws**, retry it up to `SAVE_REQUEST_ID_ATTEMPTS` times in all, `SAVE_REQUEST_ID_DELAY_MS` apart.
       - **It still throws** after the last attempt: `fal.cancel(modelId, requestId)` (a failed cancel is logged), log ERROR `{ jobId, requestId }` "couldn't save the fal request id", return 503.
       - **It returns null** (the job is no longer `submitting`): re-read the job.
         - If `job.fal_request_id === requestId`, the webhook already linked our request: info log, return 200.
         - Otherwise this submit is a duplicate (a lost lease, or another request was linked). Call `fal.cancel(modelId, requestId)` (a failed cancel is logged), log WARN `{ jobId, requestId, orphanFalRequest: true }`, return 200.
    6. Errors:

       | Error | Action |
       |---|---|
       | Retryable `FalError` or `StorageError`, with `attempts < 5` | `transitionJob(["submitting"] → "queued", { lease_expires_at: null })`, return 503 |
       | Retryable, with `attempts ≥ 5` | `failJob("SUBMIT_FAILED")`, return 200 |
       | Non-retryable `FalError` | `failJob("SUBMIT_REJECTED", message)`, return 200 |

- [ ] **Step 1: Failing tests**

```ts
it("submits to fal and links the request", async () => {
  expect(await runGenerate(deps, job.id)).toBe(200);
  expect(fal.calls[0]).toEqual({ method: "submit", args: ["fal-ai/flux/schnell", expect.objectContaining({ enable_safety_checker: true }), "https://api.test/webhooks/fal"] });
  expect(await getJob(testDb, job.id)).toMatchObject({ status: "submitted", fal_request_id: "req_1", attempts: 1, lease_expires_at: null });
});
it("signs input URLs for 24 h from the inputs bucket", ...);              // kling job with one upload → createSignedUrl("inputs", path, 86400); input.image_url = that URL
it("ignores a second delivery once submitted", ...);                      // second runGenerate → 200, fal.calls has length 1
it("leaves a job with a live lease alone", ...);  it("takes over an expired submitting lease and resubmits", ...);  // attempts 2
it("returns 503 and requeues on a retryable fal error", ...);            // status "queued", credits still reserved
it("fails with SUBMIT_FAILED after the fifth retryable error and releases credits", ...);
it("fails with SUBMIT_REJECTED on a 4xx and releases credits", ...);
it("fails with MODEL_UNAVAILABLE when the model is gone and releases credits", ...);   // Review Focus 1: model_key "removed-model"
it("POST /tasks/generate rejects a bad body with 422", ...);
it("puts the job id in the fal webhook URL", ...);                       // webhookUrl "https://api.test/webhooks/fal?jobId=<id>"
// The next three use vi.mock (partial) of src/db/repositories/jobs.repo.js so transitionJob throws N times
it("retries saving the request id and succeeds on the third try", ...);  // throws twice → submitted with fal_request_id "req_1"; fal.cancel not called
it("cancels the fal request when the request id can't be saved", ...);    // throws 3 times → returns 503; fal.calls includes cancel("…", "req_1"); ERROR log
it("doesn't cancel when the webhook already linked our request", ...);  // transitionJob returns null, job.fal_request_id === "req_1" → 200, no cancel
it("cancels its own request as a duplicate when another one is linked", ...);  // job already submitted with "req_other" → cancel("…", "req_1"); WARN with orphanFalRequest: true
```
- [ ] **Step 2:** Run `npm test -- test/services/jobs/generate.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, and add the worker route.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): worker generate task submits jobs to fal`.

---

### Task 9: fal webhook

**Files:**
- Create: `src/db/repositories/providerEvents.repo.ts`, `src/services/jobs/falWebhook.ts`, `test/api/webhooks.fal.test.ts`
- Modify: `src/api/routes/webhooks.ts` (`POST /webhooks/fal` with `express.raw({ type: "*/*", limit: "1mb" })`), `src/db/repositories/jobs.repo.ts` (add `linkFalRequest`)

**Interfaces:**
- Consumes: Task 3 `verifyFalWebhook`, `FalWebhookBody` and `deps.falKeys`; Task 4 `TaskQueue`; `getJobByFalRequestId`.
- Produces:
  - `recordProviderEvent(db, p: { provider: "fal"; requestId: string; status: string; payload: unknown; now: Date }): Promise<boolean>`, using `ON CONFLICT (provider, request_id) DO NOTHING`. It returns true when the row is new.
  - `linkFalRequest(db, jobId: string, requestId: string, now: Date): Promise<JobRow | null>`, in jobs.repo. It's a compare-and-set: `UPDATE … SET status = 'submitted', fal_request_id = ?, submitted_at = now, lease_expires_at = NULL, updated_at = now WHERE id = ? AND status = 'submitting' AND fal_request_id IS NULL RETURNING *`.
  - **`handleFalWebhook(deps, rawBody: Buffer, headers: FalWebhookHeaders, jobIdParam: string | undefined): Promise<200 | 401 | 503>`:**
    1. Verification fails → 401.
    2. The body doesn't match `FalWebhookBody` → ERROR log with `requestId`, then 200.
    3. `recordProviderEvent`.
    4. Find the job by `request_id`. If there's none and `jobIdParam` is a UUID, try `linkFalRequest(jobIdParam, request_id)` (Decision 6):
       - **Linked** → carry on with that job.
       - **Not linked, but `jobIdParam` exists** (it already has a different request id, or isn't `submitting`) → WARN `{ jobId, requestId, orphanFalRequest: true }`, then 200. It will never match, so fal shouldn't retry.
       - **`jobIdParam` doesn't exist** → the same orphan WARN, then 200.
       - **No `jobIdParam`** and no match → 503 (info log), so fal retries.
    5. The job is `completed` or `failed` → 200.
    6. `queue.enqueue("finalize", jobId, "0")`. If that fails → 503.
    7. Return 200.
  - **Route:** `POST /webhooks/fal?jobId=<uuid>` passes `req.query.jobId` (a string, or undefined) as `jobIdParam`.

- [ ] **Step 1: Failing tests** (requests are signed with `signFalWebhook`)

```ts
it("rejects a bad signature with 401 and records nothing", ...);
it("records the event and queues finalize", ...);                     // job submitted with fal_request_id "req_1" → 200; provider_events 1 row; queue finalize suffix "0"
it("handles a duplicate webhook once", ...);                          // same body twice → 200 both; 1 provider_events row; 1 queued task
it("answers 503 when no job is linked yet", ...);                     // event row still recorded
it("ignores webhooks for finished jobs", ...);                        // completed job → 200, no task
it("answers 200 and logs ERROR for a malformed body", ...);
it("answers 503 when queueing finalize fails", ...);
it("links an unsaved request to its still-submitting job through ?jobId", ...);   // job submitting, fal_request_id null → 200; job submitted with "req_1"; finalize queued
it("logs an orphan and answers 200 when the job already has another request", ...); // job has "req_2"; webhook req_1 ?jobId → 200, no task, WARN orphanFalRequest; provider_events row kept
it("logs an orphan for an unknown ?jobId", ...);
```
- [ ] **Step 2:** Run `npm test -- test/api/webhooks.fal.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, mounting the route next to `/webhooks/paddle`.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): signed fal webhook queues finalize`.

---

### Task 10: Worker `finalize` task and download URLs

**Files:**
- Create: `src/services/jobs/finalize.ts`, `test/services/jobs/finalize.test.ts`, `test/api/jobs.download.test.ts`
- Modify: `src/worker/server.ts` (`POST /tasks/finalize`), `src/api/routes/jobs.ts` (`GET /v1/jobs/:id/download-url`)

**Interfaces:**
- Consumes: `claimJob`, `transitionJob`, `failJob`, `captureCredits(trx, jobId)`, `getModel`, `OutputInvalidError`, `FalClient.status`/`result`, and `StorageClient.copyFromUrl`/`createSignedUrl`.
- Produces:
  - `const FINALIZE_LEASE_MS = 900_000`.
  - `extensionFor(mimeType: string): string`: `image/png` → `png`, `image/jpeg` → `jpg`, `image/webp` → `webp`, `video/mp4` → `mp4`, anything else → `bin`.
  - **`runFinalize(deps, jobId: string): Promise<200 | 503>`:**
    1. Claim: `claimJob({ from: "submitted", orExpiredLease: "finalizing", to: "finalizing", leaseUntil: now + 15 min, incrementAttempts: false })`. Null → 200.
    2. The model is gone → `MODEL_UNAVAILABLE` → 200.
    3. `fal.status`. Anything other than `COMPLETED`, or a retryable `FalError` → `transitionJob(["finalizing"] → "submitted", { lease_expires_at: null })` → 503.
    4. `fal.result`:
       - `{ ok: false }` → `failJob("GENERATION_FAILED", message)` → 200;
       - a retryable `FalError` → back to `submitted` → 503.
    5. `model.parseOutput(data)`:
       - `OutputInvalidError` → `OUTPUT_INVALID`;
       - no outputs and `blockedCount > 0` → `CONTENT_BLOCKED`;
       - no outputs and `blockedCount === 0` → `OUTPUT_INVALID`.

       Each of these → 200.
    6. For each output `i`: `copyFromUrl(STORAGE_BUCKET_OUTPUTS, `${userId}/${jobId}/${i}.${ext}`, url, mimeType)`. A `StorageError` → back to `submitted` → 503, with the credits still reserved.
    7. In one transaction: `transitionJob(["finalizing"] → "completed", { outputs: JobOutput[], completed_at: now, lease_expires_at: null })`; if it applied → `captureCredits`.
    8. Return 200.
  - **`getDownloadUrl(deps, userId: string, jobId: string, index: number): Promise<{ url: string; expiresAt: Date }>`:**
    - not the owner, or an `index` out of range → 404 `NOT_FOUND`;
    - the job isn't completed → 409 `JOB_NOT_COMPLETED`;
    - otherwise `createSignedUrl(bucket, path, 3600)`, with `expiresAt` = now + 1 h.
  - **Route:** `GET /v1/jobs/:id/download-url?index=0` (`index` is an integer ≥ 0, default 0) → `200 { url, expiresAt }`.

- [ ] **Step 1: Failing tests** (start from a `submitted` job whose `fal_request_id` is "req_1", with fal status COMPLETED and a result fixture)

```ts
it("copies outputs, completes the job and captures the credits", async () => {
  expect(await runFinalize(deps, job.id)).toBe(200);
  expect(storage.copies).toEqual([{ bucket: "outputs", path: `${userId}/${job.id}/0.jpg`, sourceUrl: "https://fal.media/files/a.jpg", mimeType: "image/jpeg" }]);
  expect(await getJob(testDb, job.id)).toMatchObject({ status: "completed", outputs: [{ bucket: "outputs", path: `${userId}/${job.id}/0.jpg`, mimeType: "image/jpeg" }] });
  expect(await allocationStatuses(job.id)).toEqual(["captured"]);
});
it("returns 503 and goes back to submitted while fal is still running", ...);
it("fails with GENERATION_FAILED on a fal error and releases credits", ...);
it("fails with CONTENT_BLOCKED when every output is blocked and releases credits", ...);
it("completes with the safe outputs when only some are blocked", ...);
it("fails with OUTPUT_INVALID on an empty or unexpected result and captures nothing", ...);      // Review Focus 5
it("returns 503 and keeps credits reserved when copying fails", ...);                              // Review Focus 3: storage.failNext("copyFromUrl")
it("fails with MODEL_UNAVAILABLE when the model is gone", ...);                                     // Review Focus 1
it("does nothing for a second delivery after completion", ...);                                     // no second capture
// test/api/jobs.download.test.ts
it("gives the owner a 1-hour signed URL", ...);   // url ".../outputs/<path>?mode=read&expires=3600"
it("returns 409 JOB_NOT_COMPLETED before completion", ...);  it("returns 404 for another user or an index out of range", ...);
```
- [ ] **Step 2:** Run `npm test -- test/services/jobs/finalize.test.ts test/api/jobs.download.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, and add the routes.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): finalize copies outputs and captures credits; signed downloads`.

---

### Task 11: Reconciler

**Files:**
- Create: `src/services/jobs/reconcile.ts`, `test/services/jobs/reconcile.test.ts`
- Modify: `src/db/repositories/jobs.repo.ts` (add `listJobsForReconcile`), `src/worker/server.ts` (`POST /tasks/reconcile`)

**Interfaces:**
- Consumes: `TaskQueue`, `FalClient.status`/`cancel`, `failJob` and `getModel`.
- Produces:
  - `listJobsForReconcile(db, p: { status: JobStatus; updatedBefore?: Date; leaseExpiredBefore?: Date; submittedBefore?: Date; limit: number }): Promise<JobRow[]>`, oldest first.
  - `reconcileSuffix(attempts: number, now: Date): string` = `` `r${attempts}-${Math.floor(now.getTime() / 600_000)}` ``.
  - `type ReconcileCounts = { requeuedGenerate: number; requeuedFinalize: number; polled: number; timedOut: number }`.
  - **`runReconcile(deps): Promise<ReconcileCounts>`**, up to 100 rows per bucket, with each row's errors logged and skipped:

    | Bucket | Condition | Action |
    |---|---|---|
    | 1 | `queued`, updated more than 2 min ago | Enqueue `generate` |
    | 2 | `submitting` with an expired lease | Enqueue `generate` |
    | 3 | `finalizing` with an expired lease | Enqueue `finalize` |
    | 4 | `submitted` past its model's `timeoutMinutes` (60 if the model is unknown) | `fal.cancel` (errors logged), then `failJob("TIMED_OUT")` |
    | 5 | Other `submitted` jobs updated more than 3 min ago | `fal.status`: `COMPLETED` → enqueue `finalize`; otherwise leave it |

    Every reconciler enqueue uses the `reconcileSuffix` suffix. A fal error in bucket 5 → WARN, then move on.
  - **Route:** `POST /tasks/reconcile` → `200 ReconcileCounts`.

- [ ] **Step 1: Failing tests**

```ts
it("re-queues a queued job older than 2 minutes", ...);         // suffix reconcileSuffix(0, now); 1 min old → untouched
it("re-queues expired submitting and finalizing leases", ...);
it("polls fal for submitted jobs older than 3 minutes and queues finalize when completed", ...);  // IN_PROGRESS → nothing
it("times out a job past its model timeout, cancels at fal and releases once", ...);  // kling 61 min → cancel called; status failed TIMED_OUT; reconcile again → no second release
it("dedupes within 10 minutes and re-queues after", ...);       // two runs same window → 1 task; clock +10 min → a new task
it("handles at most 100 rows per bucket", ...);
it("POST /tasks/reconcile returns the counts", ...);
```
- [ ] **Step 2:** Run `npm test -- test/services/jobs/reconcile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, and add the worker route.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(generation): reconciler recovers stuck jobs and missed webhooks`.

---

### Task 12: Runbook and full verification

**Files:** Modify `backend/README.md` and `backend/AGENTS.md`.

The README gains:
- **The generation flow**, as a diagram plus the state list.
- **The new env keys** in the env table.
- **Supabase setup:**
  - private buckets `inputs` and `outputs`;
  - `inputs` gets `file_size_limit` 20 MB and `allowed_mime_types` `image/png,image/jpeg,image/webp`;
  - where `SUPABASE_SECRET_KEY` comes from.
- **Local end-to-end run:**
  - `TASKS_MODE=http`, `WORKER_URL=http://localhost:8081`;
  - the API and worker run side by side;
  - fal webhooks need a public `API_PUBLIC_URL` (e.g. a tunnel). Without one, call `curl -X POST localhost:8081/tasks/reconcile` after about 3 min and the reconciler polls fal.
- **Cloud Scheduler jobs:** `/tasks/reconcile` every 5 minutes and `/tasks/billing-sweep` hourly, both OIDC.
- **Cloud Tasks queues:**
  - `generation`: max attempts 5, backoff 10 s → 5 min, deadline 60 s;
  - `finalization`: max attempts 10, deadline 15 min;
  - worker request timeout 15 min.
- **The milestone 2 acceptance check** (backend spec §12): in a dev GCP/Supabase project, one real image job and one real video job run end to end. Afterwards, available credits have dropped by the cost and nothing is left reserved.
- **Counting orphan fal requests** (Decision 6): look for log lines with `orphanFalRequest: true`, or run `select count(*) from app.provider_events e where not exists (select 1 from app.jobs j where j.fal_request_id = e.request_id)`.

AGENTS.md gains the job state machine rules and the "one id everywhere" rule.

- [ ] **Step 1:** Write the docs.
- [ ] **Step 2:** Run `cd backend && npm ci && npm run lint && npm run typecheck && npm test && npm run build && docker build -t pixel-magic-backend .`. Expected: all pass.
- [ ] **Step 3: Commit** with `docs(generation): runbook for the generation flow`.
