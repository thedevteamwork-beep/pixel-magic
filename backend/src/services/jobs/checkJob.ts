import { FalError } from "../../clients/fal.js";
import { touchSubmittedJob } from "../../db/repositories/jobs.repo.js";
import type { JobRow } from "../../db/rows.js";
import type { Deps } from "../../deps.js";
import { getModel } from "../../models/registry.js";

/**
 * At most one fal status check per job in this window, however often the app
 * polls. Just under the image studio's 2.5 s poll, so each of its polls checks.
 */
export const FAL_CHECK_INTERVAL_MS = 2_000;

/**
 * The app polls `GET /v1/jobs/:id` while a job runs. For a job fal is still
 * working on, that poll asks fal whether it is done and, if so, queues the
 * job's finalize, as fal's webhook would. A job then finishes even when the
 * webhook cannot arrive (running locally, without a tunnel); with the webhook
 * it is a harmless second path, since finalize claims a job only once.
 *
 * Never throws: a failed check only means the next poll asks again.
 */
export async function checkSubmittedJob(
  deps: Deps,
  job: JobRow,
): Promise<void> {
  if (job.status !== "submitted" || !job.fal_request_id) return;
  const model = getModel(job.model_key);
  if (!model) return;
  const now = deps.clock.now();
  // `updated_at` moves on every check (and at submit), which throttles checks.
  if (now.getTime() - job.updated_at.getTime() < FAL_CHECK_INTERVAL_MS) return;

  try {
    const status = await model.checkPredictionStatus({
      fal: deps.fal,
      requestId: job.fal_request_id,
      hasImage: job.upload_ids.length > 0,
    });
    if (status === "COMPLETED") {
      await deps.queue.enqueue("finalize", job.id, "0");
    } else {
      await touchSubmittedJob(deps.db, job.id, now);
    }
  } catch (err) {
    deps.logger.warn("Checking fal for a polled job failed", {
      jobId: job.id,
      err: err instanceof FalError ? err.message : err,
    });
  }
}
