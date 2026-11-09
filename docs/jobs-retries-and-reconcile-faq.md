# Jobs, Cloud Tasks retries and reconcile: FAQ

How a job keeps moving when something breaks: Cloud Tasks retries, the job's
own `attempts` counter, and the reconciler. Every answer is one line. The exact
numbers and where they are set are in [limits-and-timings.md](limits-and-timings.md).

```
queued ──→ submitting ──→ submitted ──→ finalizing ──→ completed
  (generate task)  (fal working)  (finalize task)
any of these can go to → failed
```

## 1. The job

**Q: Who creates a job?**\
A: The API (`createJob`): it inserts the row with status `queued` and reserves the credits in the same transaction.

**Q: Where does the job id come from?**\
A: Postgres creates it (`gen_random_uuid()`) when the row is inserted.

**Q: What can change a job's status?**\
A: Only the compare-and-set functions in `jobs.repo` (`claimJob`, `transitionJob`, `linkFalRequest`) and `failJob`.

**Q: What is a lease?**\
A: "A worker is on this job until this time"; no other worker can claim it before the lease runs out.

**Q: How long are the leases?**\
A: 2 minutes for generate, 15 minutes for finalize.

## 2. Cloud Tasks

**Q: What is Cloud Tasks used for?**\
A: It carries one job id to the worker as an HTTP POST to `/tasks/generate` or `/tasks/finalize`.

**Q: What is inside a task?**\
A: Only `{ jobId }`.

**Q: How many queues are there?**\
A: Two: `generation` for generate tasks and `finalization` for finalize tasks.

**Q: Who adds a generate task?**\
A: `createJob` (suffix `0`) and reconcile steps 1 and 2.

**Q: Who adds a finalize task?**\
A: The fal webhook (suffix `0`) and reconcile steps 3, 4 and 5.

**Q: How is a task named?**\
A: `sha256(kind:jobId:suffix)`, so the same job, kind and suffix always give the same name.

**Q: What if the same task is added twice?**\
A: Cloud Tasks refuses the second one (`ALREADY_EXISTS`) and our code treats that as success.

**Q: Why does reconcile use a different suffix (`r<attempts>-<10-minute window>`)?**\
A: The name with suffix `0` was already used, so Cloud Tasks would refuse it.

**Q: How many tasks run at once?**\
A: Up to 10 in `generation` and 5 in `finalization`; the rest wait in the queue.

**Q: How many tasks can wait in a queue?**\
A: Cloud Tasks has no practical cap; in this app each user has at most 4 active jobs.

**Q: Does the generate task wait for fal to finish the image or video?**\
A: No, it returns as soon as fal accepts the request; the result comes later through the webhook.

## 3. Cloud Tasks retries

**Q: When does Cloud Tasks retry a task?**\
A: When the worker answers non-2xx, or doesn't answer within the deadline (60 s for generate, 15 min for finalize).

**Q: How many tries does one task get?**\
A: 5 in `generation` and 10 in `finalization`, counting the first try.

**Q: How long does it wait between tries?**\
A: 10 s, 20 s, 40 s, 80 s, 160 s, then 300 s for every later try.

**Q: When does the worker answer 503 on purpose?**\
A: When it wants Cloud Tasks to try again later.

**Q: When does generate answer 503?**\
A: When fal or Storage had a temporary error (job goes back to `queued`), when less than 10 s of lease is left, or when saving fal's request id failed.

**Q: When does finalize answer 503?**\
A: When fal isn't finished yet, or fal or Storage had a temporary error; the job goes back to `submitted` first.

**Q: When does the worker answer 200?**\
A: When the job moved on, was failed, or couldn't be claimed because it isn't waiting for this task.

**Q: What happens after the last try?**\
A: Cloud Tasks drops the task, but the job stays in the database and reconcile picks it up.

**Q: Does a task added by reconcile get fresh tries?**\
A: Yes, it is a new task with its own 5 or 10 tries.

## 4. The job's `attempts` counter

**Q: What is `job.attempts`?**\
A: A column on the job that counts how many times generate has claimed it.

**Q: When does it go up?**\
A: On every generate claim, whether the task came from `createJob` or from reconcile.

**Q: Does finalize increase it?**\
A: No, finalize claims with `incrementAttempts: false`.

**Q: What is the limit?**\
A: 5 (`MAX_SUBMIT_ATTEMPTS`).

**Q: What happens at the limit?**\
A: An error on the 5th claim, or any 6th claim, fails the job with `SUBMIT_FAILED` and returns the credits.

**Q: How is it different from Cloud Tasks' tries?**\
A: Cloud Tasks counts tries of one task and starts again for each new task; `attempts` counts claims of the job and never resets.

**Q: Why are both needed?**\
A: Cloud Tasks tries cover short glitches; `attempts` stops reconcile from restarting a broken job forever.

**Q: What else uses `attempts`?**\
A: Reconcile puts it in the task name suffix, so a job that was claimed again gets a new task name.

## 5. Reconcile in general

**Q: What is reconcile?**\
A: A cleanup job that finds stuck jobs and either restarts them or fails them and returns the credits.

**Q: When does it run?**\
A: Every 5 minutes, when Cloud Scheduler calls `POST /tasks/reconcile` on the worker.

**Q: What is a "stuck" job?**\
A: A job that has sat in one status longer than it should.

**Q: How many jobs does it handle per run?**\
A: At most 100 per step (`BUCKET_LIMIT`), oldest first; the rest wait for the next run.

**Q: What is `bucket` in its logs?**\
A: The step number (1 to 5), not a Storage bucket.

**Q: What if one job throws an error?**\
A: It is logged and the run moves on to the next job.

**Q: Is it safe if it runs twice?**\
A: Yes, a duplicate task is either refused by Cloud Tasks or finds nothing to do, and credits are never returned twice.

**Q: What does it return?**\
A: Counts: `requeuedGenerate`, `requeuedFinalize`, `polled` and `timedOut`.

## 6. Reconcile step 1: never started (`queued`)

**Q: Which jobs does it look at?**\
A: Jobs still `queued` after 2 minutes.

**Q: Why would a job get stuck there?**\
A: The job was saved, but its generate task never reached Cloud Tasks.

**Q: What does reconcile do?**\
A: It adds the generate task again.

**Q: Could the job end up with two generate tasks?**\
A: Yes, but only one can claim the job; the other answers 200 and does nothing.

## 7. Reconcile step 2: died while sending to fal (`submitting`)

**Q: Which jobs does it look at?**\
A: Jobs in `submitting` whose 2-minute lease has run out.

**Q: Why would a job get stuck there?**\
A: The worker crashed while sending the job to fal.

**Q: Why didn't Cloud Tasks' own retry fix it?**\
A: The retry came while the lease was still running, so it couldn't claim the job and answered 200.

**Q: What does reconcile do?**\
A: It adds the generate task again.

**Q: Can this go on forever?**\
A: No, `attempts` stops it at 5 claims with `SUBMIT_FAILED`.

## 8. Reconcile step 3: died while saving the result (`finalizing`)

**Q: Which jobs does it look at?**\
A: Jobs in `finalizing` whose 15-minute lease has run out.

**Q: Why would a job get stuck there?**\
A: fal finished, but the worker crashed while copying the result to Storage.

**Q: What does reconcile do?**\
A: It adds the finalize task again.

**Q: When does it give up?**\
A: Past the model's timeout plus 60 minutes, it fails the job with `TIMED_OUT` and returns the credits.

**Q: Does `attempts` matter here?**\
A: No, only time matters for finalize.

## 9. Reconcile step 4: fal took too long (`submitted`, past timeout)

**Q: Which jobs does it look at?**\
A: Jobs still `submitted` after the model's timeout (FLUX 10 min, Kling 60 min).

**Q: What does it do first?**\
A: It asks fal one last time whether the job is finished.

**Q: What if fal says finished?**\
A: It adds the finalize task, so the result is kept.

**Q: What if fal says not finished?**\
A: It cancels the request at fal, fails the job with `TIMED_OUT` and returns the credits.

**Q: What if fal doesn't answer?**\
A: It leaves the job and asks again next run, until timeout plus 60 minutes; after that it fails the job without asking.

## 10. Reconcile step 5: webhook didn't come (`submitted`, 3+ minutes)

**Q: Which jobs does it look at?**\
A: Jobs `submitted` for 3 minutes or more that are not timed out yet.

**Q: Why would a job get stuck there?**\
A: fal may have finished, but its webhook never reached us.

**Q: What does reconcile do?**\
A: It asks fal itself whether the job is finished.

**Q: What if fal says finished?**\
A: It adds the finalize task.

**Q: What if fal says still running?**\
A: It sets the job's `updated_at` to now and asks again on a later run.

**Q: Does that reset the timeout?**\
A: No, the timeout counts from `submitted_at`, which doesn't change.

**Q: What if the job's model no longer exists?**\
A: It adds the finalize task, which fails the job with `MODEL_UNAVAILABLE` and returns the credits.

## 11. Credits

**Q: When are credits reserved?**\
A: In `createJob`, in the same transaction that inserts the job.

**Q: When are they spent?**\
A: When finalize moves the job to `completed` (`captureCredits`).

**Q: When are they returned?**\
A: Only in `failJob`, which every failure goes through (`releaseCredits`).

**Q: Can they be returned twice?**\
A: No, `failJob` only acts on a job still in the expected status, and only allocations still `reserved` are released.

## 12. Putting it together

**Q: Everything works. What happens?**\
A: `createJob` → generate (try 1) → `submitted` → webhook → finalize (try 1) → `completed`; reconcile never touches it.

**Q: Cloud Tasks is down when the job is created?**\
A: The job stays `queued`; reconcile step 1 adds the generate task after 2 to 7 minutes.

**Q: fal is down when generate sends the job?**\
A: Tries 1 to 4 put the job back to `queued` and answer 503; try 5 fails it with `SUBMIT_FAILED` (about 2.5 minutes in all).

**Q: The worker crashes right after claiming the job for generate?**\
A: Cloud Tasks' retry finds the lease still running and gives up; reconcile step 2 adds a new task once the lease ends.

**Q: fal finishes but the webhook is lost?**\
A: Reconcile step 5 asks fal, sees it finished, and adds the finalize task.

**Q: Storage is down during finalize?**\
A: Finalize puts the job back to `submitted` and Cloud Tasks retries up to 10 times; after that reconcile steps 5 and 4 keep re-adding finalize until timeout plus 60 minutes.

**Q: fal never finishes?**\
A: Reconcile step 4 cancels it at fal and fails it with `TIMED_OUT` once the model's timeout has passed.
