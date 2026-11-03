import { FalError } from "../../clients/fal.js";
import { StorageError } from "../../clients/storage.js";
import { captureCredits } from "../../db/repositories/credits.repo.js";
import { claimJob, transitionJob } from "../../db/repositories/jobs.repo.js";
import type { JobErrorCode, JobOutput, JobRow } from "../../db/rows.js";
import type { Deps } from "../../deps.js";
import { getModel } from "../../models/registry.js";
import { OutputInvalidError, type ParsedOutput } from "../../models/types.js";
import { failJob } from "./jobs.js";

export const FINALIZE_LEASE_MS = 900_000;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? "bin";
}

async function failFinalizing(
  deps: Deps,
  jobId: string,
  code: JobErrorCode,
  detail: string,
): Promise<200> {
  const applied = await deps.db.transaction((trx) =>
    failJob(trx, deps, jobId, ["finalizing"], code, detail),
  );
  if (!applied) {
    deps.logger.info("Job was no longer finalizing; not failed", {
      jobId,
      code,
    });
  }
  return 200;
}

async function backToSubmitted(
  deps: Deps,
  jobId: string,
  reason: unknown,
): Promise<503> {
  const now = deps.clock.now();
  const back = await transitionJob(
    deps.db,
    jobId,
    ["finalizing"],
    { status: "submitted", lease_expires_at: null },
    now,
  );
  if (back) {
    deps.logger.info("Job state changed", {
      jobId,
      from: "finalizing",
      to: "submitted",
    });
  } else {
    deps.logger.info("Job changed meanwhile; not returned to submitted", {
      jobId,
    });
  }
  deps.logger.warn("Finalize will retry", { jobId, reason });
  return 503;
}

export async function runFinalize(
  deps: Deps,
  jobId: string,
): Promise<200 | 503> {
  const now = deps.clock.now();
  const job = await claimJob(deps.db, jobId, {
    from: "submitted",
    orExpiredLease: "finalizing",
    to: "finalizing",
    leaseUntil: new Date(now.getTime() + FINALIZE_LEASE_MS),
    now,
    incrementAttempts: false,
  });
  if (!job) {
    deps.logger.info("Finalize skipped: job not claimable", { jobId });
    return 200;
  }
  deps.logger.info("Job state changed", {
    jobId,
    from: "submitted",
    to: "finalizing",
  });

  try {
    return await finalizeClaimed(deps, job);
  } catch (err) {
    // Never strand a job in `finalizing`: release the lease and retry.
    deps.logger.error("Unexpected finalize error", { jobId, err });
    return backToSubmitted(deps, jobId, err);
  }
}

async function finalizeClaimed(deps: Deps, job: JobRow): Promise<200 | 503> {
  const jobId = job.id;
  const model = getModel(job.model_key);
  if (!model) {
    return failFinalizing(
      deps,
      jobId,
      "MODEL_UNAVAILABLE",
      `Unknown model ${job.model_key}`,
    );
  }
  const requestId = job.fal_request_id;
  if (!requestId) {
    return failFinalizing(
      deps,
      jobId,
      "OUTPUT_INVALID",
      "Job has no fal request id",
    );
  }

  const prediction = {
    fal: deps.fal,
    requestId,
    hasImage: job.upload_ids.length > 0,
  };
  let data: unknown;
  try {
    const status = await model.checkPredictionStatus(prediction);
    if (status !== "COMPLETED")
      return await backToSubmitted(deps, jobId, status);
    const result = await model.getPredictionResult(prediction);
    if (!result.ok) {
      return failFinalizing(deps, jobId, "GENERATION_FAILED", result.message);
    }
    data = result.data;
  } catch (err) {
    if (err instanceof FalError && err.retryable) {
      return backToSubmitted(deps, jobId, err);
    }
    if (err instanceof FalError) {
      return failFinalizing(deps, jobId, "GENERATION_FAILED", err.message);
    }
    throw err;
  }

  let parsed: ParsedOutput;
  try {
    parsed = model.parseOutput(data);
  } catch (err) {
    if (err instanceof OutputInvalidError) {
      return failFinalizing(deps, jobId, "OUTPUT_INVALID", err.message);
    }
    throw err;
  }
  if (parsed.outputs.length === 0) {
    return parsed.blockedCount > 0
      ? failFinalizing(deps, jobId, "CONTENT_BLOCKED", "All outputs blocked")
      : failFinalizing(deps, jobId, "OUTPUT_INVALID", "Result had no outputs");
  }
  const bad = parsed.outputs.find(
    (o) =>
      !o.url.startsWith("https://") || !Object.hasOwn(EXTENSIONS, o.mimeType),
  );
  if (bad) {
    return failFinalizing(
      deps,
      jobId,
      "OUTPUT_INVALID",
      "Output URL is not https or its type is unsupported",
    );
  }

  const bucket = deps.config.STORAGE_BUCKET_OUTPUTS;
  const outputs: JobOutput[] = [];
  try {
    for (const [i, o] of parsed.outputs.entries()) {
      const path = `${job.user_id}/${jobId}/${i}.${extensionFor(o.mimeType)}`;
      await deps.storage.copyFromUrl(bucket, path, o.url, o.mimeType);
      outputs.push({ bucket, path, mimeType: o.mimeType });
    }
  } catch (err) {
    if (err instanceof StorageError) return backToSubmitted(deps, jobId, err);
    throw err;
  }

  const completedAt = deps.clock.now();
  const completed = await deps.db.transaction(async (trx) => {
    const row = await transitionJob(
      trx,
      jobId,
      ["finalizing"],
      {
        status: "completed",
        outputs,
        completed_at: completedAt,
        lease_expires_at: null,
      },
      completedAt,
    );
    if (!row) return false;
    await captureCredits(trx, jobId);
    return true;
  });
  if (completed) {
    deps.logger.info("Job state changed", {
      jobId,
      from: "finalizing",
      to: "completed",
    });
  } else {
    deps.logger.info("Job changed meanwhile; not completed", { jobId });
  }
  return 200;
}
