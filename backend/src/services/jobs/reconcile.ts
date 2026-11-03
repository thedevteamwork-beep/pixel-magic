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
    (job) => requeue(3, job, "finalize"),
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
  const isTimedOut = (job: JobRow): boolean =>
    (job.submitted_at ?? job.updated_at).getTime() <
    now.getTime() - timeoutMinutes(job) * 60_000;
  const timedOutIds = new Set<string>();
  await each(4, timedOutRows.filter(isTimedOut), async (job) => {
    timedOutIds.add(job.id);
    const model = getModel(job.model_key);
    if (model && job.fal_request_id) {
      try {
        await deps.fal.cancel(model.falModelId, job.fal_request_id);
      } catch (err) {
        logger.warn("Reconcile fal cancel failed", {
          jobId: job.id,
          bucket: 4,
          err,
        });
      }
    }
    const applied = await deps.db.transaction((trx) =>
      failJob(
        trx,
        deps,
        job.id,
        ["submitted"],
        "TIMED_OUT",
        `timed out after ${timeoutMinutes(job)} minutes`,
      ),
    );
    if (applied) {
      counts.timedOut += 1;
      logger.info("Reconcile timed out job", { jobId: job.id, bucket: 4 });
    }
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
      if (!model || !job.fal_request_id) return;
      let status;
      try {
        status = await deps.fal.status(model.falModelId, job.fal_request_id);
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
