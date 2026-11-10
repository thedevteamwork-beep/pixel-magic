import { FalError } from "../../clients/fal.js";
import {
  listJobsForReconcile,
  touchSubmittedJob,
} from "../../db/repositories/jobs.repo.js";
import type { JobRow } from "../../db/rows.js";
import type { Deps } from "../../deps.js";
import { getModel, listModels } from "../../models/registry.js";
import { failJob } from "./jobs.js";

const BUCKET_LIMIT = 100;
const BUCKET_MS = 600_000;
const QUEUED_STALE_MS = 2 * 60_000;
const SUBMITTED_POLL_MS = 3 * 60_000;
const DEFAULT_TIMEOUT_MINUTES = 60;
/** Past timeout + this, a job fails even if fal finished it. */
const HARD_CEILING_EXTRA_MINUTES = 60;

export type ReconcileCounts = {
  requeuedGenerate: number;
  requeuedFinalize: number;
  polled: number;
  timedOut: number;
};

export function reconcileSuffix(attempts: number, now: Date): string {
  return `r${attempts}-${Math.floor(now.getTime() / BUCKET_MS)}`;
}

function timeoutMinutes(job: JobRow): number {
  return getModel(job.model_key)?.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
}

export async function runReconcile(deps: Deps): Promise<ReconcileCounts> {
  const { logger } = deps;
  const now = deps.clock.now();
  const counts: ReconcileCounts = {
    requeuedGenerate: 0,
    requeuedFinalize: 0,
    polled: 0,
    timedOut: 0,
  };

  // Runs one row; a failure is logged and never stops the run.
  const each = async (
    bucket: number,
    rows: JobRow[],
    fn: (job: JobRow) => Promise<void>,
  ): Promise<void> => {
    for (const job of rows) {
      try {
        await fn(job);
      } catch (err) {
        logger.error("Reconcile row failed", { jobId: job.id, bucket, err });
      }
    }
  };

  const ageMs = (job: JobRow): number =>
    now.getTime() - (job.submitted_at ?? job.updated_at).getTime();
  const isTimedOut = (job: JobRow): boolean =>
    ageMs(job) > timeoutMinutes(job) * 60_000;
  const isPastCeiling = (job: JobRow): boolean =>
    ageMs(job) > (timeoutMinutes(job) + HARD_CEILING_EXTRA_MINUTES) * 60_000;

  const timeOut = async (
    bucket: number,
    job: JobRow,
    from: "submitted" | "finalizing",
  ): Promise<void> => {
    const applied = await deps.db.transaction((trx) =>
      failJob(
        trx,
        deps,
        job.id,
        [from],
        "TIMED_OUT",
        `still ${from} ${Math.floor(ageMs(job) / 60_000)} minutes after submission (timeout ${timeoutMinutes(job)})`,
      ),
    );
    if (applied) {
      counts.timedOut += 1;
      logger.info("Reconcile timed out job", { jobId: job.id, bucket });
    }
  };

  const requeue = async (
    bucket: number,
    job: JobRow,
    kind: "generate" | "finalize",
  ): Promise<void> => {
    await deps.queue.enqueue(kind, job.id, reconcileSuffix(job.attempts, now));
    if (kind === "generate") counts.requeuedGenerate += 1;
    else counts.requeuedFinalize += 1;
    logger.info("Reconcile enqueued", { jobId: job.id, bucket, kind });
  };

  await each(
    1,
    await listJobsForReconcile(deps.db, {
      status: "queued",
      updatedBefore: new Date(now.getTime() - QUEUED_STALE_MS),
      limit: BUCKET_LIMIT,
    }),
    (job) => requeue(1, job, "generate"),
  );

  await each(
    2,
    await listJobsForReconcile(deps.db, {
      status: "submitting",
      leaseExpiredBefore: now,
      limit: BUCKET_LIMIT,
    }),
    (job) => requeue(2, job, "generate"),
  );

  await each(
    3,
    await listJobsForReconcile(deps.db, {
      status: "finalizing",
      leaseExpiredBefore: now,
      limit: BUCKET_LIMIT,
    }),
    // A finalize that keeps dying must not hold the credits forever.
    (job) =>
      isPastCeiling(job)
        ? timeOut(3, job, "finalizing")
        : requeue(3, job, "finalize"),
  );

  const shortest = Math.min(
    DEFAULT_TIMEOUT_MINUTES,
    ...listModels().map((m) => m.timeoutMinutes),
  );
  const timedOutRows = await listJobsForReconcile(deps.db, {
    status: "submitted",
    submittedBefore: new Date(now.getTime() - shortest * 60_000),
    limit: BUCKET_LIMIT,
  });
  const timedOutIds = new Set<string>();
  await each(4, timedOutRows.filter(isTimedOut), async (job) => {
    timedOutIds.add(job.id);
    const model = getModel(job.model_key);
    const hasImage = job.upload_ids.length > 0;
    if (model && job.fal_request_id && !isPastCeiling(job)) {
      // Ask fal first: a finished result (say, one whose copy kept failing
      // during a storage outage) is finalized instead of thrown away.
      let status;
      try {
        status = await model.checkPredictionStatus({
          fal: deps.fal,
          requestId: job.fal_request_id,
          hasImage,
        });
      } catch (err) {
        if (err instanceof FalError) {
          logger.warn("Reconcile fal status failed", {
            jobId: job.id,
            bucket: 4,
            err,
          });
          return;
        }
        throw err;
      }
      counts.polled += 1;
      if (status === "COMPLETED") {
        await requeue(4, job, "finalize");
        return;
      }
    }
    if (model && job.fal_request_id) {
      try {
        await model.cancelPrediction({
          fal: deps.fal,
          requestId: job.fal_request_id,
          hasImage,
        });
      } catch (err) {
        logger.warn("Reconcile fal cancel failed", {
          jobId: job.id,
          bucket: 4,
          err,
        });
      }
    }
    await timeOut(4, job, "submitted");
  });

  const pollRows = await listJobsForReconcile(deps.db, {
    status: "submitted",
    updatedBefore: new Date(now.getTime() - SUBMITTED_POLL_MS),
    limit: BUCKET_LIMIT,
  });
  await each(
    5,
    pollRows.filter((job) => !timedOutIds.has(job.id) && !isTimedOut(job)),
    async (job) => {
      const model = getModel(job.model_key);
      if (!model) {
        // finalize fails it with MODEL_UNAVAILABLE and releases the credits.
        await requeue(5, job, "finalize");
        return;
      }
      if (!job.fal_request_id) return;
      let status;
      try {
        status = await model.checkPredictionStatus({
          fal: deps.fal,
          requestId: job.fal_request_id,
          hasImage: job.upload_ids.length > 0,
        });
      } catch (err) {
        if (err instanceof FalError) {
          logger.warn("Reconcile fal status failed", {
            jobId: job.id,
            bucket: 5,
            err,
          });
          return;
        }
        throw err;
      }
      counts.polled += 1;
      if (status === "COMPLETED") {
        await requeue(5, job, "finalize");
      } else {
        // Polling must move the job out of the oldest-updated window.
        await touchSubmittedJob(deps.db, job.id, now);
      }
    },
  );

  return counts;
}
