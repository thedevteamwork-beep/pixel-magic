# Pixel Magic — sign-in, a working generate page, a job list and the GCP deploy script

- **Date:** 2026-11-07
- **Status:** awaiting user approval
- **Builds on:** `docs/superpowers/specs/2026-10-28-backend-design.md` (architecture §3, deploy §10 and milestone 4), `docs/superpowers/specs/2026-11-01-plans-addons-design.md` (billing sweep §6.9), and the backend README's API table.

## 1. Intent

The backend is built and tested but nobody can use it yet. The frontend in `frontend/` is still the static landing page, and nothing is deployed.

This work makes the first real generation possible end to end:
1. a user signs in;
2. they fill in a plain form;
3. they press **Generate** and see their image or video;
4. the same code runs on Cloud Run with one script.

The user asked for a bare, working page ("just 1 button that calls the backend generation API with the inputs"), with design polish to come later.

## 2. Goals

1. **Sign-in.** A user can sign up and sign in with email and password, or with Google. Both go through Supabase Auth. Signing out works.
2. **Generate page.** A signed-in user can:
   - choose a model;
   - type a prompt;
   - set that model's options;
   - add an image when the model takes one;
   - press **Generate**.

   The page creates the job, polls it until it ends and shows the result.
3. **Credit balance.** The header shows the signed-in user's credit balance.
4. **Job list.** The backend gains `GET /v1/jobs`, which lists the user's jobs newest first, for a "my creations" page later.
5. **Env files.** Every value the frontend, backend and deploy script need sits in one committed example file per place, with comments.
6. **Deploy script.** `infra/setup.sh` creates and updates everything on GCP that the architecture needs. It is safe to run again.

## 3. Non-goals

- **Styling and design polish of the generate page.** It should be clean and usable with the existing `ui/` components, but it is not the final studio design.
- **Pricing, checkout, account and billing pages, and Paddle.js.** These come next.
- **A history or gallery page.** Only the backend list endpoint is built now.
- **Deploying the frontend to Vercel.** That is done in Vercel's UI; the README lists the env vars it needs.
- **Running the deploy script.** It changes the user's GCP account, so the user runs it.
- **CI/CD for deploys.** Deploys stay manual (backend design §4.3 call 12).

## 4. Anti-goals

These would make the work a failure even if it technically works:
- **A failed or lost poll leaving the user's credits stuck, or a second job created by a double click.** The `Idempotency-Key` and the server-side job state already prevent both; the frontend must not work around them.
- **Any secret in the frontend.** Only Supabase's publishable key and public URLs go into `NEXT_PUBLIC_*` values.
- **A deploy script that only works on a fresh project.** Running it a second time must update, not fail.
- **Code that's hard to read.** The user wants plain code laid out like Pixelbin's projects. The poller follows Pixelbin `sharingan`'s `pollPrediction` (`services/sharingan/src/services/predictions.service.js` in the Pixelbin repo at `/Users/tusharbansal/Desktop/Azure Repo/Pixelbin`).

## 5. Constraints

- **Frontend stack.** Next.js 16.4.3 with React 19.3 and Tailwind 4 (`frontend/package.json`).
  - Per `frontend/AGENTS.md`, this Next.js has breaking changes. The builder reads `frontend/node_modules/next/dist/docs/` before writing routing, auth-redirect or server/client component code, and follows its conventions over memory.
  - Reuse the existing `ui/` components (`Button`, `Container`, `Chip` and so on) and the `@/` import alias.
- **Supabase.** Use the official `@supabase/supabase-js` with Supabase's Next.js session helper (`@supabase/ssr`), so the session lives in cookies and survives reloads.
  - The access token is sent to our API as `Authorization: Bearer <token>`.
  - The backend already verifies it (`backend/src/api/middlewares/auth.ts`). It rejects anonymous users, and creates the profile and Free plan on the first authenticated call (`ensureUser`).
- **The backend API is the source of truth.** Use the routes as they exist; see the API table in `backend/README.md`. Error bodies are `{ code, message, meta? }`, with stable `code` strings.
- **Backend rules stay.** SQL only in repositories; time from `deps.clock`; one test process at a time; every change passes `npm test && npm run lint && npm run typecheck`.
- **Deploy.** It follows backend design §10 "Infrastructure" exactly:
  - an Artifact Registry repository;
  - `pixel-magic-api`, public, running as `api-sa`;
  - `pixel-magic-worker`, private, running as `worker-sa`, with a 15-minute timeout;
  - `tasks-sa`, which has `run.invoker` on the worker. `api-sa` and `worker-sa` have `cloudtasks.enqueuer`, and `iam.serviceAccountUser` on `tasks-sa`;
  - two queues;
  - Cloud Scheduler jobs using OIDC;
  - Secret Manager secrets;
  - the same region as the Supabase project.
- **Images are built with Cloud Build** (`gcloud builds submit`), not local Docker. Docker Hub pulls fail on the user's Mac, and Cloud Build needs no local Docker.
- **The app's production config guard holds.** On Cloud Run (`K_SERVICE` set), `TASKS_MODE` must be `cloud` and `GCP_PROJECT_ID`, `GCP_REGION` and `TASKS_SERVICE_ACCOUNT` must be set (`backend/src/config.ts`). `FAL_WEBHOOK_USER_ID` must be set in production (`backend/.env.example`).

## 6. What gets built

### 6.1 Frontend foundation

- **`frontend/.env.example`** (committed) and `frontend/.env.local` (git-ignored, the user's copy) hold:
  - `NEXT_PUBLIC_API_URL`, e.g. `http://localhost:8080`;
  - `NEXT_PUBLIC_SUPABASE_URL`;
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`).

  Each line gets a one-line comment saying where to find the value. `frontend/.gitignore` currently ignores `.env*`, so add a `!.env.example` exception.
- **The app fails clearly when a value is missing:** one small env module reads and checks the three values and throws a message naming the missing key. That's better than failing deep inside a fetch.
- **An API client** (one small module) exposes `get`/`post` helpers:
  - each adds the current Supabase access token and the JSON headers;
  - an error body becomes an `ApiError` carrying `status`, `code`, `message` and `meta`;
  - `newIdempotencyKey()` returns a `crypto.randomUUID()`.
- **Hand-written TypeScript types for the responses this work uses:**
  - `GET /v1/models`, plus the field-schema union: string, integer, boolean, image;
  - `GET /v1/me` (credits), `POST /v1/uploads`, the job view and `GET /v1/jobs`.

  Copy them from the backend's actual response code, not from memory.

### 6.2 Sign-in

- **Pages:** a `/sign-in` page with tabs for "Sign in" and "Create account". Each has email and password fields, plus a **Continue with Google** button. Sign-out goes in the header.
- **After sign-up:** the user sees "Check your email to confirm your account". The backend design §4.3 call 13 turns on Supabase's "Confirm email".
- **Google:** uses Supabase's OAuth redirect, plus an auth callback route that finishes the sign-in and sends the user to `/generate`.
- **Protected pages:** `/generate` requires a session. Without one, the user goes to `/sign-in` and comes back afterwards.
- **Header when signed in:** the header's "Get started" becomes the user's email, their credit balance and "Sign out".
  - The balance comes from `GET /v1/me`. Show the available credits; the builder picks the right field from the actual `/v1/me` response.
  - When signed out, "Get started" links to `/sign-in`.

### 6.3 The generate page (`/generate`)

A single client page:
1. **Model:** a select, filled from `GET /v1/models`. It shows each model's `name`, and its `credits.min`–`credits.max` as a hint.
2. **Prompt:** a text area that respects the model's prompt `maxLength`, and is required when the model says so.
3. **Options:** built from the model's `input` schema, skipping `prompt` and the image field:
   - a `string` with `enum` → a select, preset to its `default`;
   - an `integer` → a number input with `minimum`/`maximum`, preset to `default`;
   - a `boolean` → a checkbox;
   - a `string` without `enum` → a text input.

   Each field's `description` is its label hint.
4. **Image:** when the model has an image field, a file picker limited to the field's `supportedContentTypes`, and optional when the field isn't required. On submit the image is uploaded first:
   - call `POST /v1/uploads` with `{ filename, mimeType, sizeBytes }`;
   - upload with supabase-js `storage.from(bucket).uploadToSignedUrl(path, token, file)`;
   - keep the `uploadId`.

   The bucket name comes from what `POST /v1/uploads` returns. If it doesn't return one, read the backend's upload code and use the inputs bucket name it signs for.
5. **One Generate button.** It is disabled while a job is running. On click:
   - make a new `Idempotency-Key`, upload the image if any, then `POST /v1/jobs` with `{ model, prompt, uploadIds, options }`. Send only option keys the model declares; the backend rejects unknown keys.
   - Then poll.
6. **Polling** (`pollJob(jobId, { signal })` plus a small hook). It works like sharingan's `pollPrediction`, with these differences:
   - It calls `GET /v1/jobs/:id`. It stops on `completed` (returning the job, whose `outputs[].url` are signed links) and on `failed` (throwing with `error.message`, which is safe to show).
   - Every other status means it is still working.
   - The interval is 4 s for image models and 8 s for video models (`kind` from `/v1/models`).
   - **No overall attempt cap.** The backend's reconciler guarantees every job ends.
   - **Retry transient errors.** A network error or 5xx retries with the same interval, up to 5 failures in a row, before showing "lost connection, retrying stopped" with a **Check again** button. A 4xx stops at once.
   - An `AbortSignal` stops polling when the user leaves the page.
   - The current `jobId` is kept in the URL (`/generate?job=<id>`), so a reload resumes polling and shows the result.
7. **Status and result.**
   - While running, show the status and the credits being charged (`creditCost`).
   - On `completed`, show each output: an `<img>` for image types and a `<video controls>` for video, with a download link.
   - On `failed`, show `error.message` and say the credits were returned.
   - After either, refresh the header balance.
8. **Errors from `POST /v1/jobs`.** Map these `code` strings to plain messages:
   - `INSUFFICIENT_CREDITS`: "Not enough credits for this job". Billing pages come later, so no link yet.
   - `TOO_MANY_ACTIVE_JOBS`: "You have too many jobs running; wait for one to finish".
   - `UPLOAD_NOT_READY`: "The image didn't finish uploading; try again".
   - `VALIDATION_FAILED`: show `message`, plus the field from `meta` when present.
   - `UNAUTHENTICATED`: send the user to sign-in.

**Out of scope here:** the live estimate call (`POST /v1/credits/estimate`). The model's `credits` range and the job's `creditCost` are enough for this bare page. The user can ask for the estimate later.

### 6.4 Landing page links

- "Get started" and the hero's main call to action go to `/generate`. Signed-out users get bounced to `/sign-in` first.
- All other `#` placeholder links stay as they are.

### 6.5 Backend: `GET /v1/jobs`

- **Where:** a panel route in `backend/src/api/routes/panel/jobs.routes.ts`, behind the existing per-area login guard.
- **Query:**
  - `limit`: 1–50, default 20;
  - `cursor`: optional, opaque; the value returned as `nextCursor`.
- **Response:** `{ jobs: JobView[], nextCursor: string | null }`.
  - Newest first by `created_at`, with `id` as the tie-break, using keyset pagination.
  - Only the caller's own jobs.
- **Output URLs:** each job uses the same view as `GET /v1/jobs/:id`, so completed jobs carry signed output URLs.
  - Signing many outputs one by one is slow, so add a batch `createSignedUrls(bucket, paths, ttl)` to `StorageClient`, backed by Supabase's batch call, plus `FakeStorage`.
  - A list request signs all its completed outputs in one call per bucket.
- **Validation:** a bad `cursor` or `limit` → `422 VALIDATION_FAILED`.
- **Docs and tests:** a README row, and the route added to `test/api/routes.test.ts`'s endpoint list.

### 6.6 Deploy: `infra/setup.sh`

The script is idempotent: it creates what's missing and updates what exists. It reads its settings from `infra/deploy.env`, which is git-ignored, with a committed and fully commented `infra/deploy.env.example`.

**Settings in `infra/deploy.env`:**
- **Project:** `GCP_PROJECT_ID`, `GCP_REGION`.
- **Non-secret app config:** `SUPABASE_URL`, `CORS_ORIGINS` (the Vercel URL plus localhost), `PADDLE_ENV`, `FAL_WEBHOOK_USER_ID`, the bucket names, and the optional `TIERED_CREDIT_MAPPING`.
- **Secrets, entered once:** `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SUPABASE_SECRET_KEY`, `FAL_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`. The script puts these in Secret Manager. A new value adds a new secret version. Cloud Run reads them with `--set-secrets`; they are never passed as plain env vars.

**Steps, each safe to repeat:**
1. Check that `gcloud` is logged in and the project exists. Enable the needed services: Run, Cloud Build, Artifact Registry, Cloud Tasks, Cloud Scheduler, Secret Manager and IAM.
2. Create the Artifact Registry Docker repository.
3. Build and push the image from `backend/` with `gcloud builds submit`, tagged with the git short SHA.
4. Create the service accounts `api-sa`, `worker-sa`, `tasks-sa` and `scheduler-sa`, and give:
   - `api-sa` and `worker-sa`: secret access, `cloudtasks.enqueuer`, and `iam.serviceAccountUser` on `tasks-sa`;
   - `tasks-sa` and `scheduler-sa`: `run.invoker` on the worker, and nothing else.
5. Create or update the queues `generation` and `finalization` (the names come from the app's config defaults). Give them retry settings the builder chooses from backend design §7, and states in the README.
6. Run migrations and the catalog seed. This is a Cloud Run **job**, `pixel-magic-migrate`, using the same image with `DATABASE_MIGRATION_URL`. It runs the compiled migrate and seed entry points (`node dist/...`, since `tsx` isn't in the production image), and the script waits for it to finish.
   - The builder confirms the compiled paths exist, and fixes the build if they don't.
   - The seed must be safe to run again, so check it.
7. Deploy `pixel-magic-worker`:
   - `MODE=worker`, `--no-allow-unauthenticated`, 15-minute timeout, `worker-sa`;
   - `TASKS_MODE=cloud`, plus the GCP and tasks service-account settings.
8. Deploy `pixel-magic-api`:
   - `MODE=api`, public, `api-sa`, the same `TASKS_*` settings;
   - `WORKER_URL` set to the worker's URL.
9. Set `API_PUBLIC_URL` on both services to the API's URL. The worker builds fal's webhook URL from it. Both URLs are read back with `gcloud run services describe`, so re-runs keep them right.
10. Create or update two Cloud Scheduler jobs, both OIDC-authenticated as `scheduler-sa` with audience = the worker URL:
    - `pixel-magic-reconcile`: POST `/tasks/reconcile`, every 5 minutes;
    - `pixel-magic-billing-sweep`: POST `/tasks/billing-sweep`, hourly.
11. Print the API URL, the worker URL, the webhook URLs to paste into Paddle (`/webhooks/paddle`), and a checklist of what's left by hand.

**The script must also:**
- use `set -euo pipefail`;
- echo each step;
- pass `shellcheck` if it's installed;
- never print secret values.

**README section "Deploy to GCP":**
- what to install (`gcloud`);
- how to fill in `infra/deploy.env`;
- how to run the script and what it creates;
- the Paddle webhook setup;
- how to roll back to a previous revision.

### 6.7 Setup checklist (README)

A short "Set up Supabase, Google and Vercel" section covering:

**Supabase:**
- create the project in the same region as `GCP_REGION`;
- create two private buckets, `inputs` and `outputs`;
- in Auth, turn on Email with "Confirm email";
- turn on Google with a client ID and secret from a Google Cloud OAuth client, whose authorized redirect URI is `https://<project>.supabase.co/auth/v1/callback`;
- set the Site URL and redirect URLs: `http://localhost:3000/auth/callback` and the Vercel URL's callback;
- copy the publishable key and the secret key to where each belongs.

**Vercel:** the three `NEXT_PUBLIC_*` values.

**Running it locally end to end:** backend `.env`, then the API and worker processes, then `npm run dev` in `frontend/`.

### 6.8 Settled during review

- **Database URLs on Cloud Run.** Backend design §6 already chose the two connections:
  - **`DATABASE_URL`:** Supabase's **transaction pooler**, port 6543, with a small pool. `pg` through knex uses unnamed statements, which the transaction pooler supports.
  - **`DATABASE_MIGRATION_URL`:** a session connection. *My call:* use Supabase's **session pooler**, which is the pooler host on port 5432, not the direct `db.<project>.supabase.co` host. The direct host is IPv6-only, and Cloud Run without a VPC can't reach it. So no VPC connector is needed.
  - `deploy.env.example` and the README show both URL formats and say which is which.
- **Region, projects and the Vercel URL.** *My call:* the script doesn't assume they already exist.
  - `GCP_REGION` is blank in the example, with "use your Supabase project's region".
  - If there's no Vercel URL yet, `CORS_ORIGINS` starts as `http://localhost:3000`. The README says to re-run `setup.sh` (it's idempotent) once the Vercel URL is known, and to add that URL to Supabase's redirect list.
- **Re-running the catalog seed.** Plans design §3.2 call 14 already settled this: the seed upserts by `name`, and the seed file is the catalog's source of truth. A re-run therefore overwrites catalog fields with the file's values, which is intended. Changing a price means editing the seed and re-running.

## 7. Left to the builder

- Component and file layout inside `frontend/src` (for example `lib/api/`, `lib/supabase/`, `app/generate/`, `app/sign-in/`), matching the existing folders.
- Exact copy and wording of messages, within the meanings given above.
- Queue retry numbers, Cloud Run CPU and memory, and min and max instances (README states them).
- How the hook is shaped, as long as `pollJob` stays a plain function that is testable without React.
- **Frontend tests.** The frontend has no test runner today. Add Vitest only for the pure modules (`pollJob`, the API client's error mapping, the form-from-schema helper). Don't set up component or browser tests in this round.

## 8. How we'll know it works

1. **Backend:** `npm test`, lint and typecheck pass. New tests cover `GET /v1/jobs` (pagination, cursor, other users' jobs hidden, batch-signed URLs for completed jobs) and `createSignedUrls` in `FakeStorage`.
2. **Frontend:** `npm run build` and `npm run lint` pass. The new Vitest tests pass.
   - `pollJob`: completes, fails, stops on abort, retries 5xx up to the limit, stops at once on 4xx.
   - The form-from-schema helper gives the right default options for kling21 and flux-schnell.
3. **Deploy script:** `bash -n infra/setup.sh` passes, and `shellcheck` too when installed. The user runs it against their project; the README's checklist is the acceptance check.
4. **By hand, with real keys (the user):**
   - sign up with email, confirm, sign in; sign in with Google;
   - generate a flux image and a kling21 text-to-video and image-to-video;
   - reload during a video job, and polling resumes;
   - the balance drops by `creditCost`.
