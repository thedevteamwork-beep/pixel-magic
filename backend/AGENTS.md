# Backend notes for agents

## Layering

`routes` (HTTP, validation, auth) call `services` (business rules, transactions), which call `db/repositories` (SQL) and `clients` (Paddle, fal, Storage, Cloud Tasks). Dependencies are passed in through `Deps` (`src/deps.ts`). Routes may call a repository directly for a simple read (for example the catalog, `GET /v1/billing/invoices`, the active subscription for a response); anything with a business rule, a write or a Paddle call goes through a service. Routes never call Paddle or write SQL; repositories contain no business rules; clients know nothing about the DB.

## SQL only in repositories

All Knex queries live in `src/db/repositories/*.repo.ts`. Services pass a `db` or `trx` into them. Row types are in `src/db/rows.ts`.

## Schema-qualified tables

Use the `T` map in `src/db/tables.ts` (for example `app.subscriptions`), never bare table names. Migrations create everything in the `app` schema. Knex's own bookkeeping tables live in `app_migrations` (revoked from Supabase's API roles), never in `public`.

## Clock rule

Never call `new Date()` or the DB `now()` for business timestamps. Use `deps.clock.now()` and pass the time into repositories, which write `created_at`, `updated_at` and any compared timestamp from it. DB defaults are only a fallback. Tests fake the clock.

## Errors

Throw `AppError(status, code, message)` from `src/lib/errors.ts`. Codes: `UNAUTHENTICATED`, `VALIDATION_FAILED`, `NOT_FOUND`, `PLAN_NOT_AVAILABLE`, `ADDON_NOT_AVAILABLE`, `ALREADY_ON_PLAN`, `RENEWAL_IN_PROGRESS`, `PAYMENT_PAST_DUE`, `NO_SCHEDULED_CHANGE`, `INSUFFICIENT_CREDITS`, `PAYMENT_PROVIDER_ERROR`, `UPLOAD_NOT_READY`, `IDEMPOTENCY_KEY_REUSED`, `TOO_MANY_ACTIVE_JOBS`, `JOB_NOT_COMPLETED`, `INTERNAL`. Add new codes to the `ErrorCode` union.

## Job state machine

`queued` -> `submitting` -> `submitted` -> `finalizing` -> `completed`; any non-final state can go to `failed`. `completed` and `failed` are final.

- Status changes only through the compare-and-set functions in `jobs.repo` (`claimJob`, `transitionJob`, `linkFalRequest`) and `failJob` (`services/jobs/jobs.ts`, built on `transitionJob`); each names the states it may move from. Never write `status` any other way.
- Credits follow the job: reserved at creation, captured on `completed`, released on `failed`. Fail a job only through `failJob` (it releases credits once).
- After an error, fail the job or send it back to the previous state with the lease cleared. One deliberate exception: when saving the fal request id keeps failing, generate cancels that request and leaves the job `submitting` under its lease (Decision 6); the lease runs out and the task retry or the reconciler takes it over.
- Every active state is bounded: generate fails a job after 5 attempts (`SUBMIT_FAILED`), and the reconciler fails `submitted` and `finalizing` jobs that outlive their limits (`TIMED_OUT`).
- Lock order: for an existing job, lock/update the job row first and touch credits (which lock the profile) second. Never take the profile lock and then update an existing job row.
- Lock order with projects: profile, then project. Deleting a project unlinks its jobs before it touches the project row, and never takes the profile lock.
- `error_message` shown to users is fixed per error code (`JOB_ERROR_MESSAGES`); raw provider text goes only to logs.
- Every task (generate, finalize, reconcile) must be safe to run twice.

## One id everywhere

The job id is the only id we invent. It is the payload of every task (`{jobId}`), part of the deterministic Cloud Tasks name (hash of kind, job id and a suffix; the suffix changes only for reconciler re-queues), part of the output Storage path (`<userId>/<jobId>/<index>.<ext>`), the `?jobId=` on the fal webhook URL, and the `job_id` of credit reservations. fal's request id is stored once on the job (`fal_request_id`) and looked up from there; never derive state from anything else.

## Projects

- Project types (their `data` schema and allowed model kinds) live in `src/projects/registry.ts`; add a type there.
- Jobs keep all generation state. A project only groups jobs through `jobs.project_id`; it never stores outputs or status.
- Deleting a project only unlinks its jobs (`project_id` becomes null); they and their credits are untouched.

## Conventions

- ESM with NodeNext: relative imports end in `.js`.
- Node 22 (`nvm use`).
- Webhook handling must be idempotent (unique `paddle_event_id`, compare-and-set on invoices).
- Before committing run `npm run lint`, `npm run typecheck` and `npm test`, and all must pass.
