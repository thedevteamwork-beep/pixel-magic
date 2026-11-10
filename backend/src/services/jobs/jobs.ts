import type { Knex } from "knex";
import type { Deps } from "../../deps.js";
import {
  countActiveJobs,
  getJobByIdempotencyKey,
  insertJob,
  transitionJob,
} from "../../db/repositories/jobs.repo.js";
import {
  releaseCredits,
  reserveCredits,
} from "../../db/repositories/credits.repo.js";
import { lockProfile } from "../../db/repositories/profiles.repo.js";
import type { JobErrorCode, JobRow, JobStatus } from "../../db/rows.js";
import { AppError } from "../../lib/errors.js";
import { canonicalJson, sha256Hex } from "../../lib/hash.js";
import { getOperation } from "../../models/registry.js";
import { uploadIdsIn } from "../../models/schemaGenerator.js";
import { estimateCredits } from "../credits/estimate.js";
import { resolveUploads } from "../uploads.js";

export type JobView = {
  jobId: string;
  status: JobStatus;
  model: string;
  creditCost: number;
  createdAt: Date;
  completedAt: Date | null;
  /** Signed URLs, only once the job is `completed`; empty before. */
  outputs: { index: number; mimeType: string; url: string; expiresAt: Date }[];
  error?: { code: JobErrorCode; message: string };
};

export const DOWNLOAD_URL_TTL_SECONDS = 3600;

/** The job as the client sees it. A completed job gets fresh signed output URLs. */
export async function jobView(deps: Deps, job: JobRow): Promise<JobView> {
  return (await jobViews(deps, [job]))[0];
}

/** Views in the order of `jobs`; signs the outputs of all completed jobs with one call per bucket. */
export async function jobViews(deps: Deps, jobs: JobRow[]): Promise<JobView[]> {
  const expiresAt = new Date(
    deps.clock.now().getTime() + DOWNLOAD_URL_TTL_SECONDS * 1000,
  );

  const pathsByBucket = new Map<string, string[]>();
  for (const job of completedJobs(jobs)) {
    for (const o of job.outputs ?? []) {
      pathsByBucket.set(o.bucket, [
        ...(pathsByBucket.get(o.bucket) ?? []),
        o.path,
      ]);
    }
  }
  const urlByObject = new Map<string, string>();
  for (const [bucket, paths] of pathsByBucket) {
    const urls = await deps.storage.createSignedUrls(
      bucket,
      paths,
      DOWNLOAD_URL_TTL_SECONDS,
    );
    paths.forEach((path, i) => urlByObject.set(`${bucket}/${path}`, urls[i]));
  }

  return jobs.map((job) => ({
    jobId: job.id,
    status: job.status,
    model: job.model_key,
    creditCost: job.credit_cost,
    createdAt: job.created_at,
    completedAt: job.completed_at,
    outputs:
      job.status === "completed"
        ? (job.outputs ?? []).map((o, index) => ({
            index,
            mimeType: o.mimeType,
            url: urlByObject.get(`${o.bucket}/${o.path}`)!,
            expiresAt,
          }))
        : [],
    ...(job.error_code
      ? { error: { code: job.error_code, message: job.error_message ?? "" } }
      : {}),
  }));
}

function completedJobs(jobs: JobRow[]): JobRow[] {
  return jobs.filter((job) => job.status === "completed");
}

export async function createJob(
  deps: Deps,
  userId: string,
  body: { plugin: string; operation: string; input: unknown },
  idempotencyKey: string,
): Promise<{ status: 200 | 202; job: JobView }> {
  const model = getOperation(body.plugin, body.operation);
  if (!model) throw new AppError(404, "NOT_FOUND", "Plugin not found");
  // Every field is checked against its rules in the operation's `schema.input`.
  const input = model.input.parse(body.input);
  const uploadIds = uploadIdsIn(model.uploads, input);

  // The real file type is only known once the upload is confirmed in storage.
  const uploads = await resolveUploads(deps, userId, uploadIds);
  for (const upload of uploads) {
    if (!model.uploads.supportedContentTypes.includes(upload.mime_type)) {
      throw new AppError(422, "UPLOAD_NOT_READY", "Upload is not ready", {
        uploadId: upload.id,
        reason: "mime_type",
      });
    }
  }

  const requestHash = sha256Hex(canonicalJson({ model: model.key, input }));
  // The same function as POST /v1/credits/estimate, so the two always agree.
  const { creditsPerJob: creditCost } = estimateCredits(
    deps,
    model,
    body.input,
  );

  const { job, created } = await deps.db.transaction(async (trx) => {
    await lockProfile(trx, userId);
    const existing = await getJobByIdempotencyKey(trx, userId, idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new AppError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "Idempotency key was used with a different request",
        );
      }
      return { job: existing, created: false };
    }
    if (
      (await countActiveJobs(trx, userId)) >=
      deps.config.MAX_ACTIVE_JOBS_PER_USER
    ) {
      throw new AppError(429, "TOO_MANY_ACTIVE_JOBS", "Too many active jobs");
    }
    const now = deps.clock.now();
    const row = await insertJob(trx, {
      user_id: userId,
      model_key: model.key,
      input,
      upload_ids: uploadIds,
      credit_cost: creditCost,
      idempotency_key: idempotencyKey,
      request_hash: requestHash,
      now,
    });
    if (!row) throw new Error("Job insert conflicted under the profile lock");
    await reserveCredits(trx, {
      userId,
      jobId: row.id,
      amount: creditCost,
      now,
    });
    return { job: row, created: true };
  });

  if (!created) return { status: 200, job: await jobView(deps, job) };
  try {
    await deps.queue.enqueue("generate", job.id, "0");
  } catch (err) {
    // The reconciler re-queues jobs that sit in `queued`.
    deps.logger.error("Failed to enqueue generate task", {
      jobId: job.id,
      err,
    });
  }
  return { status: 202, job: await jobView(deps, job) };
}

/** User-facing text stored as `error_message`, fixed per error code. */
export const JOB_ERROR_MESSAGES: Record<JobErrorCode, string> = {
  SUBMIT_REJECTED: "The model rejected this request.",
  SUBMIT_FAILED:
    "The model service was unavailable. Your credits were returned.",
  GENERATION_FAILED: "The model couldn't generate this request.",
  CONTENT_BLOCKED: "The result was blocked by the safety filter.",
  OUTPUT_INVALID: "The model returned an unusable result.",
  TIMED_OUT: "The generation took too long and was cancelled.",
  MODEL_UNAVAILABLE: "This model is no longer available.",
};

/**
 * Fails a job and releases its credits, once. Returns whether it applied.
 * `message` is log-only detail; the stored message is fixed per code.
 */
export async function failJob(
  trx: Knex.Transaction,
  deps: Deps,
  jobId: string,
  from: JobStatus[],
  code: JobErrorCode,
  message: string,
): Promise<boolean> {
  const now = deps.clock.now();
  const failed = await transitionJob(
    trx,
    jobId,
    from,
    {
      status: "failed",
      error_code: code,
      error_message: JOB_ERROR_MESSAGES[code],
      completed_at: now,
      lease_expires_at: null,
    },
    now,
  );
  if (!failed) return false;
  await releaseCredits(trx, jobId);
  deps.logger.warn("Job failed", {
    jobId,
    code,
    from,
    to: "failed",
    detail: message,
  });
  return true;
}
