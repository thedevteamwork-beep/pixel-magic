# Limits and timings

Every time limit, count limit and interval that shapes how a job runs. Each value
names where it is set, so change it there and update this page.

"Env" means the value can be changed with an environment variable. Everything
else is a constant in code or a flag in `infra/setup.sh`.

## 1. Job life at a glance

```
queued -> submitting -> submitted -> finalizing -> completed
                                  \-> failed (from any non-final state)
```

| Step             | Who     | Time limits that apply                                 |
| ---------------- | ------- | ------------------------------------------------------ |
| Create job       | API     | Max 4 active jobs per user                             |
| `generate` task  | worker  | Lease 2 min, dispatch deadline 60 s, 5 queue attempts and 5 submit attempts (two separate counters, see section 4) |
| Waiting for fal  | fal     | Model timeout: 10 min (flux-schnell), 60 min (kling21) |
| `finalize` task  | worker  | Lease 15 min, dispatch deadline 15 min, 10 attempts    |
| Frontend polling | browser | Every 4 s (image) or 8 s (video)                       |

## 2. Cloud Tasks queues

Set in `infra/setup.sh` (`upsert_queue`).

| Setting                                    | `generation` | `finalization` |
| ------------------------------------------ | ------------ | -------------- |
| Max attempts (first try included)          | 5            | 10             |
| Max concurrent dispatches                  | 10           | 5              |
| Min backoff                                | 10 s         | 10 s           |
| Max backoff                                | 300 s        | 300 s          |
| Max doublings                              | 4            | 4              |
| Dispatch deadline (`src/clients/tasks.ts`) | 60 s         | 900 s          |
| Max retry duration                         | not set      | not set        |

Retry waits (the doubling and cap rule is from Cloud Tasks, not verified against its docs):

| Retry | 1    | 2    | 3    | 4    | 5     | 6 and later |
| ----- | ---- | ---- | ---- | ---- | ----- | ----------- |
| Wait  | 10 s | 20 s | 40 s | 80 s | 160 s | 300 s       |

- `generation`: 4 retries, about 2.5 min in total, then the task is dropped.
- `finalization`: 9 retries, about 25 min in total, then the task is dropped.
- A dropped task does not lose the job. The reconciler enqueues it again.

A task is retried when the worker answers non-2xx or does not answer within the dispatch deadline.

Task name = `sha256(kind:jobId:suffix)`. The same name cannot be created twice, so duplicate enqueues are ignored. The suffix is `0` for normal tasks and `r<attempts>-<10-minute bucket>` for reconciler re-queues.

Local mode (`TASKS_MODE=http`): no retries, no auth, duplicate names remembered for 1 hour in memory. Not allowed on Cloud Run.

## 3. Cloud Scheduler

Set in `infra/setup.sh` (`create_scheduler_jobs`). Time zone UTC. Both call the private worker with an OIDC token.

| Job                         | Cron          | Runs        | Path                   |
| --------------------------- | ------------- | ----------- | ---------------------- |
| `pixel-magic-reconcile`     | `*/5 * * * *` | every 5 min | `/tasks/reconcile`     |
| `pixel-magic-billing-sweep` | `0 * * * *`   | every hour  | `/tasks/billing-sweep` |

## 4. Leases

A lease says "this job is mine until this time". Another worker can claim the job only after the lease runs out.

| Lease      | Value                        | Where                           |
| ---------- | ---------------------------- | ------------------------------- |
| `generate` | 2 min (`GENERATE_LEASE_MS`)  | `src/services/jobs/generate.ts` |
| `finalize` | 15 min (`FINALIZE_LEASE_MS`) | `src/services/jobs/finalize.ts` |

Related `generate` numbers (same file):

| Constant                   | Value  | Meaning                                                      |
| -------------------------- | ------ | ------------------------------------------------------------ |
| `MAX_SUBMIT_ATTEMPTS`      | 5      | After 5 attempts the job fails with `SUBMIT_FAILED`          |
| `SUBMIT_LEASE_MARGIN_MS`   | 10 s   | Does not submit to fal with less than this left on the lease |
| `SAVE_REQUEST_ID_ATTEMPTS` | 3      | Tries to save fal's request id                               |
| `SAVE_REQUEST_ID_DELAY_MS` | 200 ms | Wait between those tries                                     |

## 5. Reconciler thresholds

`src/services/jobs/reconcile.ts`. It runs every 5 minutes, so a job is picked up some time after it crosses a threshold, not at the exact moment.

| Constant                     | Value                                 |
| ---------------------------- | ------------------------------------- |
| `BUCKET_LIMIT`               | 100 jobs per category per run         |
| `QUEUED_STALE_MS`            | 2 min                                 |
| `SUBMITTED_POLL_MS`          | 3 min                                 |
| `DEFAULT_TIMEOUT_MINUTES`    | 60 (used when a model has no timeout) |
| `HARD_CEILING_EXTRA_MINUTES` | 60 (added to the model timeout)       |
| `BUCKET_MS`                  | 10 min (task-name suffix window)      |

What each category does:

| #   | Job state    | Picked up when               | Action                                                                                       |
| --- | ------------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | `queued`     | not updated for 2 min        | enqueue `generate`                                                                           |
| 2   | `submitting` | lease expired                | enqueue `generate`                                                                           |
| 3   | `finalizing` | lease expired                | enqueue `finalize`; fail with `TIMED_OUT` if older than timeout + 60 min                     |
| 4   | `submitted`  | older than the model timeout | ask fal; if completed, enqueue `finalize`; otherwise cancel at fal and fail with `TIMED_OUT` |
| 5   | `submitted`  | not updated for 3 min        | ask fal; if completed, enqueue `finalize`; otherwise refresh `updated_at`                    |

Job timeouts per model:

| Model        | `timeoutMinutes` | Hard ceiling (timeout + 60) |
| ------------ | ---------------- | --------------------------- |
| flux-schnell | 10               | 70 min                      |
| kling21      | 60               | 120 min                     |

Past the hard ceiling the reconciler no longer asks fal and just fails the job.

## 6. Billing sweep

`src/services/billing/sweep.ts`, runs every hour.

| Constant                                      | Value             |
| --------------------------------------------- | ----------------- |
| `BATCH`                                       | 500 rows per step |
| Cutoff for pending cancels and draft invoices | 24 hours          |
| Cutoff for stuck subscription rows            | 7 days            |

Billing settings (env):

| Env                        | Default |
| -------------------------- | ------- |
| `CARRYOVER_VALIDITY_DAYS`  | 30      |
| `PLAN_CHANGE_LOCK_MINUTES` | 60      |
| `CHECKOUT_REUSE_MINUTES`   | 30      |
| `RENEWAL_GRACE_MINUTES`    | 60      |

## 7. Frontend polling

`frontend/src/app/generate/useJobPolling.ts` and `frontend/src/lib/generate/pollJob.ts`.

| Setting              | Value                                              |
| -------------------- | -------------------------------------------------- |
| Interval for images  | 4 s                                                |
| Interval for videos  | 8 s                                                |
| Request              | `GET /v1/jobs/:id` (one database read)             |
| Stops on             | `completed`, `failed`, any 4xx, or abort           |
| Network error or 5xx | try again; stop after 5 in a row (`PollLostError`) |
| Attempt cap          | none, because the backend ends every job           |

## 8. Cloud Run

Set in `infra/setup.sh`.

| Setting                  | API (`pixel-magic-api`) | Worker (`pixel-magic-worker`) | Migrate job        |
| ------------------------ | ----------------------- | ----------------------------- | ------------------ |
| Public                   | yes                     | no (OIDC only)                | no                 |
| Request timeout          | 300 s                   | 900 s                         | task timeout 600 s |
| CPU                      | 1                       | 1                             | 1                  |
| Memory                   | 512 Mi                  | 1 Gi                          | 512 Mi             |
| Concurrency per instance | 80                      | 8                             | n/a                |
| Min instances            | 0                       | 0                             | n/a                |
| Max instances            | 10                      | 5                             | n/a                |
| Retries                  | n/a                     | n/a                           | 0                  |

## 9. fal and webhook

| Setting                     | Value                       | Where                               |
| --------------------------- | --------------------------- | ----------------------------------- |
| fal request timeout         | 30 s, one attempt, no retry | `src/clients/fal.ts`                |
| Webhook timestamp tolerance | 5 min                       | `src/clients/falWebhook.ts`         |
| fal public keys cache       | 24 h                        | `src/clients/falWebhook.ts`         |
| fal key fetch timeout       | 5 s                         | `src/clients/falWebhook.ts`         |
| Webhook body size           | 1 MB                        | `src/api/routes/webhooks.routes.ts` |

## 10. Files, uploads and URLs

| Setting                        | Value                                            | Where                                     |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------- |
| Max active jobs per user       | 4 (`MAX_ACTIVE_JOBS_PER_USER`, env)              | `src/config.ts`                           |
| Max upload size                | 20 MiB, 20971520 bytes (`UPLOAD_MAX_BYTES`, env) | `src/config.ts`                           |
| Allowed upload types           | png, jpeg, webp (`UPLOAD_MIME_TYPES`, env)       | `src/config.ts`                           |
| Signed upload link lifetime    | 2 h                                              | `src/services/uploads.ts`                 |
| Input image link given to fal  | 24 h                                             | `src/services/jobs/generate.ts`           |
| Download link for outputs      | 1 h                                              | `src/services/jobs/jobs.ts`               |
| Copy of an output into Storage | 10 min timeout                                   | `src/clients/storage.ts`                  |
| Catalog response cache         | 5 min (`max-age=300`)                            | `src/api/routes/public/catalog.routes.ts` |

## 11. Other

| Setting                    | Value                  | Where                                   |
| -------------------------- | ---------------------- | --------------------------------------- |
| Database pool size         | 5 (`DB_POOL_MAX`, env) | `src/config.ts`                         |
| Paddle request timeout     | 10 s                   | `src/clients/paddle.ts`                 |
| Paddle webhook cancel wait | 3 s                    | `src/services/billing/paddleWebhook.ts` |
| Billing samples kept       | 10,000                 | `src/credits/billingSamples.ts`         |

## Worst-case waits

| Situation                           | Longest time before the job ends                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook never arrives, fal finished | the reconciler polls fal for `submitted` jobs not updated for 3 min, so the job is finalized within about 3 to 8 min after submission (one run every 5 min); it is polled again at most once per run |
| fal never finishes (image)          | fails with `TIMED_OUT` after the 10 min model timeout, plus up to 5 min until the next reconciler run                                                                                                |
| fal never finishes (video)          | fails with `TIMED_OUT` after the 60 min model timeout, plus up to 5 min                                                                                                                              |
| Worker dies during `generate`       | 2 min lease, then up to 5 min until the reconciler re-queues it                                                                                                                                      |
| Worker dies during `finalize`       | 15 min lease, then up to 5 min until the reconciler re-queues it                                                                                                                                     |
| `finalize` keeps failing            | job fails with `TIMED_OUT` at timeout + 60 min                                                                                                                                                       |
