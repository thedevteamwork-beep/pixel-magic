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
import { getModel } from "../../models/registry.js";
import { resolveUploads } from "../uploads.js";

export type JobView = {
  jobId: string;
  status: JobStatus;
  model: string;
  creditCost: number;
  createdAt: Date;
  completedAt: Date | null;
  outputs: { index: number; mimeType: string }[];
  error?: { code: JobErrorCode; message: string };
};

export function jobView(job: JobRow): JobView {
  return {
    jobId: job.id,
    status: job.status,
    model: job.model_key,
    creditCost: job.credit_cost,
    createdAt: job.created_at,
    completedAt: job.completed_at,
    outputs: (job.outputs ?? []).map((o, index) => ({
      index,
      mimeType: o.mimeType,
    })),
    ...(job.error_code
      ? { error: { code: job.error_code, message: job.error_message ?? "" } }
      : {}),
  };
}

export async function createJob(
  deps: Deps,
  userId: string,
  body: {
    model: string;
    prompt: string;
    uploadIds: string[];
    options: Record<string, unknown>;
  },
  idempotencyKey: string,
): Promise<{ status: 200 | 202; job: JobView }> {
  const model = getModel(body.model);
  if (!model) throw new AppError(422, "VALIDATION_FAILED", "Unknown model");
  const options = model.options.parse(body.options);
  const { prompt, uploadIds } = body;
  if (model.prompt.required && prompt.trim().length === 0) {
    throw new AppError(422, "VALIDATION_FAILED", "Prompt is required");
  }
  if (prompt.length > model.prompt.maxLength) {
    throw new AppError(422, "VALIDATION_FAILED", "Prompt is too long");
  }
  if (
    uploadIds.length < model.uploads.min ||
    uploadIds.length > model.uploads.max
  ) {
    throw new AppError(
      422,
      "VALIDATION_FAILED",
      `This model takes ${model.uploads.min} to ${model.uploads.max} uploads`,
    );
  }

  await resolveUploads(deps, userId, uploadIds);

  const requestHash = sha256Hex(
    canonicalJson({ model: model.key, prompt, uploadIds, options }),
  );
  const creditCost = model.creditCost(options);

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
      input: { prompt, options },
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

  if (!created) return { status: 200, job: jobView(job) };
  try {
    await deps.queue.enqueue("generate", job.id, "0");
  } catch (err) {
    // The reconciler re-queues jobs that sit in `queued`.
    deps.logger.error("Failed to enqueue generate task", {
      jobId: job.id,
      err,
    });
  }
  return { status: 202, job: jobView(job) };
}

/** Fails a job and releases its credits, once. Returns whether it applied. */
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
      error_message: message.slice(0, 500),
      completed_at: now,
      lease_expires_at: null,
    },
    now,
  );
  if (!failed) return false;
  await releaseCredits(trx, jobId);
  deps.logger.warn("Job failed", { jobId, code });
  return true;
}
