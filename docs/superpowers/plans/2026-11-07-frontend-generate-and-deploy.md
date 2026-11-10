# Sign-in, generate page, job list and GCP deploy — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- A signed-in user can generate an image or video from a plain `/generate` page with one Generate button.
- The backend can list a user's jobs.
- One script deploys the backend to Cloud Run, with Cloud Tasks and Cloud Scheduler.

**Architecture:**
- The Next.js app uses Supabase Auth (email+password and Google) through `@supabase/ssr`. It calls the Cloud Run API from the browser with the Supabase access token.
- A plain `pollJob` (like Pixelbin sharingan's `pollPrediction`) polls `GET /v1/jobs/:id` until the job ends.
- `infra/setup.sh` is an idempotent `gcloud` script driven by `infra/deploy.env`.

**Tech Stack:**
- Frontend: Next.js 16.4.3, React 19.3, Tailwind 4, `@supabase/supabase-js`, `@supabase/ssr`, Vitest.
- Backend: the existing Express 5 / Zod 4 / Knex code.
- Deploy: bash plus `gcloud`.

**Spec:** `docs/superpowers/specs/2026-11-07-frontend-generate-and-deploy-design.md`. Read §6, and §6.8 for the rulings settled in review.

## Global Constraints

- **Git:** branch `feat/frontend-generate`, cut from `feat/backend-billing` at `bbd7c51`. Every commit ends with the `Co-Authored-By:` line. Never push.
- **Backend checks:** every backend change passes `npm test && npm run lint && npm run typecheck` in `backend/`. Run one test process at a time; the test DB is the `pm-verify-db` container on port 54329.
- **Frontend checks:** every frontend change passes `npm run lint && npm run build && npm test` in `frontend/`.
- **Next.js 16 conventions:** Next.js 16 has breaking changes. Before writing routing, route protection, cookies, server/client components or route handlers, read the matching guide in `frontend/node_modules/next/dist/docs/`, and follow it over memory.
- **No secrets in the frontend.** Only `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Code style:** the user wants readable, Pixelbin-style code: small plain functions, one responsibility per file, no clever generics. Frontend code reuses `src/ui/` components and the `@/` alias.
- **Polling rules, exact values:**
  - the interval is 4000 ms for `kind: "image"` and 8000 ms for `kind: "video"`;
  - there is no overall attempt cap;
  - after 5 network or 5xx errors in a row, polling stops with "lost connection";
  - any 4xx stops it at once;
  - it stops on `completed` or `failed`.
- **`GET /v1/jobs` parameters:** `limit` 1–50, default 20. `cursor` is opaque, and a bad one gives `422 VALIDATION_FAILED`. Results come newest first, by `(created_at, id)` descending.
- **Deploy names, exact:**
  - services `pixel-magic-api` (public) and `pixel-magic-worker` (private, `--timeout=900`);
  - Cloud Run job `pixel-magic-migrate`;
  - service accounts `api-sa`, `worker-sa`, `tasks-sa`, `scheduler-sa`;
  - queues `generation` and `finalization`;
  - Scheduler jobs `pixel-magic-reconcile` (`*/5 * * * *`, POST `/tasks/reconcile`) and `pixel-magic-billing-sweep` (`0 * * * *`, POST `/tasks/billing-sweep`).

## Review Focus

1. **A double click, or a retry after a network error, creates exactly one job.** One `Idempotency-Key` per Generate click is reused on retry, and the button is disabled while busy. (Task 4: `submitGeneration` test.)
2. **An expired session mid-poll stops polling and shows "sign in again", instead of looping.** A 401 is a 4xx and stops at once. (Task 4: `pollJob` test.)
3. **Sign-in's `next=` can't redirect users to another site.** Only same-site paths are allowed. (Task 3: `safeNext` test.)
4. **A form value for a key the model doesn't declare is never sent.** The backend would reject the whole job with 422. (Task 4: `buildOptions` test.)
5. **A tampered `cursor`, or another user's job, never leaks or causes a 500 on `GET /v1/jobs`.** (Task 1 tests.)

---

### Task 1: Backend — `GET /v1/jobs`, batch-signed URLs, `bucket` in the upload response

**Files:**
- Modify:
  - `backend/src/clients/storage.ts` (`createSignedUrls`), `backend/test/fakes/storage.ts`;
  - `backend/src/db/repositories/jobs.repo.ts` (`listUserJobs`);
  - `backend/src/services/jobs/jobs.ts` (`jobViews`; `jobView` reuses the batch signing);
  - `backend/src/api/routes/panel/jobs.routes.ts`;
  - `backend/src/services/uploads.ts` (return `bucket`);
  - `backend/README.md` (API table row);
  - `backend/test/api/routes.test.ts` (endpoint list).
- Test: `backend/test/api/jobs.list.test.ts` (new), `backend/test/api/uploads.test.ts`, `backend/test/clients/storage.test.ts`.

**Interfaces:**
- **`StorageClient.createSignedUrls(bucket: string, paths: string[], expiresInSeconds: number): Promise<string[]>`**
  - It returns the URLs in the same order as `paths`.
  - It is backed by supabase-js `storage.from(bucket).createSignedUrls(paths, expiresIn)`.
  - A per-item error throws the same `StorageError` as `createSignedUrl`.
  - An empty `paths` returns `[]` without calling Supabase.
- **`listUserJobs(db, userId: string, p: { limit: number; before?: { createdAt: Date; id: string } }): Promise<JobRow[]>`**
  - It uses keyset pagination: `(created_at, id) < (before.createdAt, before.id)`, ordered by `created_at desc, id desc`.
- **`jobViews(deps, jobs: JobRow[]): Promise<JobView[]>`**
  - It signs every completed job's outputs with one `createSignedUrls` call per bucket.
  - `jobView(deps, job)` becomes `(await jobViews(deps, [job]))[0]`.
- **`GET /v1/jobs?limit&cursor`** returns `200 { jobs: JobView[], nextCursor: string | null }`.
  - The cursor is the base64url of `{"t":"<created_at ISO>","id":"<uuid>"}`, encoded from the last job returned.
  - `nextCursor` is set only when more rows exist. Fetch `limit + 1` rows to know.
- **`POST /v1/uploads`** also returns `bucket` (the inputs bucket name).

- [ ] **Step 1: failing tests** (`jobs.list.test.ts`):
  - "lists the caller's jobs newest first";
  - "pages with limit and nextCursor without overlap": 3 jobs with limit 2 gives 2 jobs plus a cursor, then 1 job with `nextCursor: null`;
  - "hides other users' jobs";
  - "signs completed outputs in one batch call": two completed flux jobs give 1 `createSignedUrls` call on the outputs bucket, and every output has `url`;
  - "rejects a bad cursor or limit with 422": `cursor=abc`, `cursor=<base64url of {"t":"x","id":"1"}>`, `limit=0`, `limit=51`;
  - "needs a login": 401.

  Uploads test: the response has `bucket: "inputs"`.

  Storage test: `createSignedUrls` keeps the order, and maps an item error to `StorageError`.
- [ ] **Step 2:** Run `npm test -- test/api/jobs.list.test.ts test/api/uploads.test.ts test/clients/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces above.
- [ ] **Step 4:** Run `npm test && npm run lint && npm run typecheck`. Expected: PASS. This includes `routes.test.ts`, which checks the README endpoint list.
- [ ] **Step 5:** Commit: `feat(jobs): GET /v1/jobs with batch-signed outputs; bucket in upload response`. Include the spec and this plan file.

---

### Task 2: Frontend foundation — env, Supabase clients, API client, types, Vitest

**Files:**
- Create:
  - `frontend/.env.example`;
  - `frontend/src/lib/env.ts`;
  - `frontend/src/lib/supabase/client.ts` (browser);
  - `frontend/src/lib/supabase/server.ts` (server, cookies);
  - `frontend/src/lib/api/client.ts`, `frontend/src/lib/api/types.ts`;
  - `frontend/vitest.config.ts`;
  - `frontend/src/lib/api/client.test.ts`, `frontend/src/lib/env.test.ts`.
- Modify:
  - `frontend/package.json`: deps `@supabase/supabase-js` and `@supabase/ssr`; dev dep `vitest`; script `"test": "vitest run"`;
  - `frontend/.gitignore`: add `!.env.example` after `.env*`.

**Interfaces:**
- **`.env.example`** has three lines, each with a one-line comment saying where to find the value: `NEXT_PUBLIC_API_URL=http://localhost:8080`, `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`.
- **`publicEnv(): { apiUrl: string; supabaseUrl: string; supabasePublishableKey: string }`**
  - It reads each variable by its literal `process.env.NEXT_PUBLIC_…` name, because Next.js only inlines literal reads.
  - A missing or empty value throws `Error("Missing env NEXT_PUBLIC_…")`.
  - It strips one trailing `/` from `apiUrl`.
- **Supabase clients:**
  - `createSupabaseBrowserClient()`, from `@supabase/ssr` `createBrowserClient`;
  - `createSupabaseServerClient()`, from `createServerClient` with Next 16 cookies (see the docs).
- **API client: `createApiClient(p: { baseUrl: string; getAccessToken: () => Promise<string | null>; fetchFn?: typeof fetch })`** returns `{ get<T>(path, opts?: { signal?: AbortSignal }): Promise<T>; post<T>(path, body: unknown, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<T> }`.
  - `api` is the default instance: the browser Supabase session's `access_token`, plus `publicEnv().apiUrl`.
  - Each request sends `Authorization: Bearer <token>` when there is a token, and `Content-Type: application/json` on POST. POST also sends `Idempotency-Key` when one is given.
- **`class ApiError extends Error { status: number; code: string; meta?: unknown }`**
  - A JSON error body `{ code, message, meta }` becomes `ApiError(status, code, message, meta)`.
  - A non-JSON error body becomes `ApiError(status, "HTTP_ERROR", "Request failed (<status>)")`.
  - A `fetch` rejection becomes `ApiError(0, "NETWORK_ERROR", message)`.
  - An abort is re-thrown unchanged.
- **`newIdempotencyKey(): string`** returns `crypto.randomUUID()`.
- **`types.ts`** has hand-written types copied from the backend code, not from memory:
  - `PublicModel` and the `FieldSchema` union (string, integer, boolean, image), from `backend/src/models/types.ts` and `registry.ts`;
  - `Me` (`credits.available`), `UploadResponse` (incl. `bucket`), `JobStatus`, `JobView` (`outputs: { index; mimeType; url?; expiresAt? }[]`, `error?`) and `JobList`.

- [ ] **Step 1: failing tests:**
  - client: "sends the bearer token and idempotency key";
  - "maps a JSON error body to ApiError";
  - "maps a non-JSON 502 to HTTP_ERROR";
  - "maps a fetch rejection to NETWORK_ERROR";
  - "re-throws an abort unchanged";
  - env: "throws naming the missing key";
  - "strips a trailing slash from apiUrl".
- [ ] **Step 2:** `npm install`, then `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm run lint && npm run build && npm test`. Expected: PASS.
  - The build needs the env values. If `npm run build` fails only on missing env, run it with the three values set to placeholders inline, and say so in the report.
- [ ] **Step 5:** Commit: `feat(frontend): env, Supabase clients and API client`.

---

### Task 3: Sign-in, route protection, header account and balance

**Files:**
- Create:
  - `frontend/src/app/sign-in/page.tsx`, plus a client form component;
  - `frontend/src/app/auth/callback/route.ts`;
  - the Next 16 route-protection file (`proxy.ts` or `middleware.ts`, per the docs) at `frontend/src/`;
  - `frontend/src/lib/auth/safeNext.ts`, plus its test;
  - `frontend/src/lib/balance.ts`;
  - `frontend/src/components/layout/HeaderAccount.tsx`.
- Modify:
  - `frontend/src/components/layout/Header.tsx`: render `HeaderAccount` in place of the CTA;
  - `frontend/src/constants/navigation.ts` and `constants/home.ts`: "Get started" and the hero's main action go to `/generate`.

**Interfaces:**
- **`safeNext(next: string | null | undefined): string`**
  - It returns `next` only when it starts with `/`, not `//` or `/\`, and contains no `://`.
  - Otherwise it returns `"/generate"`.
- **`/sign-in?next=`** has "Sign in" and "Create account" tabs, each with email and password and a **Continue with Google** button.
  - Sign-in uses `signInWithPassword`, then navigates to `safeNext(next)`.
  - Sign-up uses `signUp` with `emailRedirectTo` = `<origin>/auth/callback?next=…`, then shows "Check your email to confirm your account".
  - Google uses `signInWithOAuth({ provider: "google", options: { redirectTo: <origin>/auth/callback?next=… } })`.
  - Supabase errors are shown as their message.
- **`/auth/callback`** exchanges `code` for a session (`exchangeCodeForSession`), then redirects to `safeNext(next)`. On error it redirects to `/sign-in?error=1`.
- **Route protection:** it refreshes the Supabase session cookie on every matched request. A request to `/generate` without a user redirects to `/sign-in?next=<path+query>`.
- **`balance.ts`:** `notifyCreditsChanged(): void` and `onCreditsChanged(cb): () => void`, using a `window` event named `pixelmagic:credits-changed`.
- **`HeaderAccount`** is a client component.
  - Signed out: a "Get started" button linking to `/sign-in`.
  - Signed in: the email, then `<available> credits` from `api.get<Me>("/v1/me")`, then "Sign out".
  - It refetches `/v1/me` on sign-in and on `onCreditsChanged`.
  - If `/v1/me` fails it shows "— credits" and doesn't break the header.

- [ ] **Step 1: failing test:** `safeNext`: `"/generate?job=1"` is kept; each of these gives `"/generate"`: `"//evil.com"`, `"/\\evil.com"`, `"https://evil.com"`, `""`, `null`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the pages, callback, protection, header and links. Read the Next 16 docs for route handlers, route protection and server/client components first.
- [ ] **Step 4:** Run `npm run lint && npm run build && npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): sign-in with email and Google, header balance`.

---

### Task 4: The generate page

**Files:**
- Create:
  - `frontend/src/lib/generate/formFromSchema.ts`;
  - `frontend/src/lib/generate/pollJob.ts`;
  - `frontend/src/lib/generate/submit.ts`;
  - `frontend/src/lib/generate/messages.ts`;
  - tests next to each;
  - `frontend/src/app/generate/page.tsx`, plus `GenerateForm` and `JobResult` client components;
  - test fixtures `frontend/src/lib/generate/fixtures.ts`: kling21 and flux-schnell exactly as `GET /v1/models` returns them, built from `backend/src/models/*/schema.ts` and `publicModel`.

**Interfaces:**
- **`formFromSchema.ts`:**
  - **`optionFields(model): [name: string, field][]`** returns every `input` entry except `prompt` and the image field.
  - **`defaultOptions(model)`** returns each option's `default`. An optional string with no default is left out.
  - **`imageField(model)`** returns the image field, or `undefined`.
  - **`buildOptions(model, values: Record<string, unknown>)`** returns only declared option keys. It coerces integers with `Number`, and drops empty strings for fields without a default.
- **`pollJob(jobId: string, p)`** returns `Promise<JobView>`. It resolves on `completed`.
  - `p` is `{ get: (path: string, opts?: { signal?: AbortSignal }) => Promise<JobView>; intervalMs: number; signal?: AbortSignal; onUpdate?: (job: JobView) => void; sleep?: (ms: number, signal?: AbortSignal) => Promise<void>; maxConsecutiveErrors?: number /* 5 */ }`.
  - It throws `JobFailedError` (with `.job`) on `failed`.
  - It re-throws an `ApiError` with status 400–499 at once.
  - It counts consecutive `NETWORK_ERROR`, `HTTP_ERROR` and 5xx errors; a success resets the count. Reaching the max throws `PollLostError`.
  - It stops with an `AbortError` when `signal` aborts, during a request or a sleep.
  - It calls `onUpdate` on every successful poll.
- **`submitGeneration(p)`** returns `Promise<JobView>`.
  - `p` is `{ api; uploadFile: (upload: UploadResponse, file: File) => Promise<void>; model: PublicModel; prompt: string; values: Record<string, unknown>; file?: File; idempotencyKey: string }`.
  - With a file, it calls `POST /v1/uploads` `{ filename, mimeType, sizeBytes }`, then `uploadFile`.
  - Then it calls `POST /v1/jobs` `{ model: model.key, prompt, uploadIds, options: buildOptions(...) }` with `idempotencyKey`.
  - The page makes the key once per click, and reuses it if the user presses "Try again" after a network error.
  - The real `uploadFile` uses `supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file)`.
- **`messageForError(err: unknown): string`** gives the spec §6.3 item 8 messages:
  - `INSUFFICIENT_CREDITS`, `TOO_MANY_ACTIVE_JOBS`, `UPLOAD_NOT_READY`;
  - `VALIDATION_FAILED` (its `message`, plus the first key from `meta`'s `unrecognized_keys` or `path`, when present);
  - `UNAUTHENTICATED` ("Your session ended — sign in again");
  - `NETWORK_ERROR`;
  - `PollLostError`: "Lost connection — retrying stopped";
  - `JobFailedError`: the job's `error.message`, plus "Your credits were returned";
  - anything else: "Something went wrong".
- **The page** (`/generate`, protected by Task 3):
  - It loads `GET /v1/models`, then shows model select → prompt → option fields → image picker (when the model has one) → one **Generate** button.
  - Widgets, labels and limits follow spec §6.3 items 1–4:
    - the model select shows `name` and `credits.min`–`credits.max`;
    - the prompt respects `maxLength` and `required`;
    - an enum gives a select, an integer a number input with min/max, a boolean a checkbox, a free string a text input;
    - the image picker uses `accept` = the field's `supportedContentTypes`.
  - The button is disabled while submitting or polling.
  - On a created job it puts `?job=<id>` in the URL and starts `pollJob` with the interval for the model's `kind`. On load with `?job=`, it resumes polling.
  - It shows the status and `creditCost`. On `completed` it shows each output (`<img>` for `image/*`, `<video controls>` for `video/*`) with a download link. On an error it shows `messageForError(err)`; a `PollLostError` also gets a **Check again** button that restarts polling.
  - When the job ends it calls `notifyCreditsChanged()`.
  - Leaving the page aborts polling.
  - For an `UNAUTHENTICATED` error it navigates to `/sign-in?next=/generate?job=<id>`.

- [ ] **Step 1: failing tests:**
  - `formFromSchema`:
    - kling21 `defaultOptions` is `{ duration: "5", aspect_ratio: "16:9" }`;
    - flux is `{ image_size: "landscape_4_3", num_images: 1 }`;
    - `optionFields(kling21)` has no `prompt` or `image`;
    - `buildOptions(kling21, { duration: "10", durations: "5", prompt: "x" })` is `{ duration: "10", aspect_ratio: "16:9" }`;
    - flux `num_images: "3"` becomes 3.
  - `pollJob`:
    - "resolves after queued → submitted → completed and reports each": 3 gets, `onUpdate` ×3;
    - "throws JobFailedError on failed";
    - "stops at once on 401": 1 get, rejects `ApiError` 401;
    - "retries 5xx and network errors, and resets on success": e.g. 502, NETWORK, ok-running, 502 ×4, ok-completed resolves;
    - "throws PollLostError after 5 in a row";
    - "aborts during sleep": no further get.

    Use a fake `sleep` that resolves at once and records the ms. Assert 4000 vs 8000 are passed through.
  - `submitGeneration`:
    - "uploads then creates the job with the same key";
    - "sends no uploadIds without a file";
    - "a retry with the same key sends the same body".
  - `messageForError`: one case per code above.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the modules, then the page with the existing `ui/` components.
- [ ] **Step 4:** Run `npm run lint && npm run build && npm test`. Expected: PASS.
- [ ] **Step 5:** Update `frontend/README.md` with "Run it locally" (copy `.env.example` to `.env.local`, start the backend API and worker, `npm run dev`, open `/generate`). Commit: `feat(frontend): generate page with one button and job polling`.

---

### Task 5: Deploy — `infra/setup.sh`, deploy env file and setup docs

**Files:**
- Create: `infra/setup.sh` (executable), `infra/deploy.env.example`.
- Modify:
  - root `.gitignore` (create it if missing): add `infra/deploy.env`;
  - `backend/README.md`: sections "Deploy to GCP" and "Set up Supabase, Google and Vercel";
  - backend build or scripts only if the compiled migrate/seed entry points don't run under plain `node`.

**Interfaces:**
- **`deploy.env.example`** is fully commented. It groups:
  - project: `GCP_PROJECT_ID`, `GCP_REGION` (blank, "use your Supabase project's region");
  - app config: `SUPABASE_URL`, `CORS_ORIGINS` (default `http://localhost:3000`, with "add your Vercel URL and re-run"), `PADDLE_ENV`, `FAL_WEBHOOK_USER_ID`, `STORAGE_BUCKET_INPUTS`, `STORAGE_BUCKET_OUTPUTS`, `FREE_PLAN_NAME`, and an optional `TIERED_CREDIT_MAPPING`;
  - secrets: `DATABASE_URL` (transaction pooler, port 6543, example format), `DATABASE_MIGRATION_URL` (session pooler, port 5432, pooler host, example format), `SUPABASE_SECRET_KEY`, `FAL_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`.
- **`setup.sh`** runs spec §6.6 steps 1–11 in order, with `set -euo pipefail`. It echoes each step's name and never echoes secret values.
  - **Settings:** it sources `infra/deploy.env`, or the path in `$1`, and fails with a clear message if a required value is empty.
  - **Idempotent:** each resource is created if missing (`describe … || create …`), otherwise updated. Secrets add a new version only when the value changed (compare a sha256 of the value with a version label, or with the latest version's payload).
  - **Service URLs:** compute both URLs before deploying, in Cloud Run's deterministic format `https://<service>-<projectNumber>.<region>.run.app`, so `WORKER_URL` and `API_PUBLIC_URL` are right on the first deploy. After deploying, compare them with `gcloud run services describe` and stop with an error if they differ.
  - **Both services get:**
    - the full app config: `MODE`, `TASKS_MODE=cloud`, `GCP_PROJECT_ID`, `GCP_REGION`, `TASKS_SERVICE_ACCOUNT=tasks-sa@…`, `API_PUBLIC_URL`, `WORKER_URL`, plus the deploy.env config values;
    - the secrets, via `--set-secrets`.
  - **`pixel-magic-migrate`** runs the compiled migrate, then the seed. Verify the paths by building `backend/` and running both with plain `node` against a scratch database on `pm-verify-db`, e.g. `createdb pm_deploy_check`, then drop it. Run it twice to prove the seed is re-runnable.
  - **The final printout:** the API URL, the worker URL, the Paddle webhook URL, and a checklist of what's left by hand (Paddle webhook, Vercel env vars, Supabase redirect URLs).
- **The README sections** cover spec §6.6's README items and §6.7's checklist. They also state the queue retry settings and the Cloud Run CPU, memory and instance settings chosen.

- [ ] **Step 1:** Verify the compiled migrate and seed run under `node`, twice, as above. Fix the build if they don't.
- [ ] **Step 2:** Write `deploy.env.example` and `setup.sh`.
- [ ] **Step 3:** Run `bash -n infra/setup.sh`. Expected: no output. Also run a dry check: `GCP_PROJECT_ID= bash infra/setup.sh infra/deploy.env.example` must stop early with the "required value is empty" message, before any `gcloud` call that changes anything.
- [ ] **Step 4:** Write the README sections. Run `npm run lint` in `backend/` (prettier covers the markdown) and fix formatting.
- [ ] **Step 5:** Commit: `feat(infra): idempotent GCP setup script, deploy env and setup docs`.
