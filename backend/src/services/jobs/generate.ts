import type { Config } from "../../config.js";
import { FalError } from "../../clients/fal.js";
import type { Deps } from "../../deps.js";
import {
  claimJob,
  getJob,
  transitionJob,
} from "../../db/repositories/jobs.repo.js";
import { getUserUploads } from "../../db/repositories/uploads.repo.js";
import type { JobRow } from "../../db/rows.js";
import { getModel } from "../../models/registry.js";
import { failJob } from "./jobs.js";

export const GENERATE_LEASE_MS = 120_000;
export const MAX_SUBMIT_ATTEMPTS = 5;
export const SAVE_REQUEST_ID_ATTEMPTS = 3;
export const SAVE_REQUEST_ID_DELAY_MS = 200;
const INPUT_URL_TTL_SECONDS = 86_400;

/** The webhook carries our job id so an unsaved request can still be linked. */
export function falWebhookUrl(config: Config, jobId: string): string {
  return `${config.API_PUBLIC_URL}/webhooks/fal?jobId=${jobId}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function failSubmitting(
  deps: Deps,
  jobId: string,
  code: "MODEL_UNAVAILABLE" | "SUBMIT_FAILED" | "SUBMIT_REJECTED",
  detail: string,
): Promise<void> {
  const applied = await deps.db.transaction((trx) =>
    failJob(trx, deps, jobId, ["submitting"], code, detail),
  );
  if (!applied) {
    deps.logger.info("Job was no longer submitting; not failed", {
      jobId,
      code,
    });
  }
}

async function cancelQuietly(
  deps: Deps,
  jobId: string,
  modelId: string,
  requestId: string,
): Promise<void> {
  try {
    await deps.fal.cancel(modelId, requestId);
  } catch (err) {
    deps.logger.warn("Couldn't cancel the fal request", {
      jobId,
      requestId,
      err,
    });
  }
}

/** Saves the request id, retrying a throwing save; returns null if not applied. */
async function saveRequestId(
  deps: Deps,
  jobId: string,
  requestId: string,
): Promise<{ saved: JobRow | null } | { threw: unknown }> {
  let lastErr: unknown;
  for (let i = 1; i <= SAVE_REQUEST_ID_ATTEMPTS; i++) {
    try {
      const now = deps.clock.now();
      const saved = await transitionJob(
        deps.db,
        jobId,
        ["submitting"],
        {
          status: "submitted",
          fal_request_id: requestId,
          submitted_at: now,
          lease_expires_at: null,
        },
        now,
      );
      return { saved };
    } catch (err) {
      lastErr = err;
      if (i < SAVE_REQUEST_ID_ATTEMPTS) await sleep(SAVE_REQUEST_ID_DELAY_MS);
    }
  }
  return { threw: lastErr };
}

export async function runGenerate(
  deps: Deps,
  jobId: string,
): Promise<200 | 503> {
  const now = deps.clock.now();
  const job = await claimJob(deps.db, jobId, {
    from: "queued",
    orExpiredLease: "submitting",
    to: "submitting",
    leaseUntil: new Date(now.getTime() + GENERATE_LEASE_MS),
    now,
    incrementAttempts: true,
  });
  if (!job) {
    deps.logger.info("Generate skipped: job not claimable", { jobId });
    return 200;
  }
  deps.logger.info("Job state changed", {
    jobId,
    from: "queued",
    to: "submitting",
    attempts: job.attempts,
  });

  const model = getModel(job.model_key);
  if (!model) {
    await failSubmitting(
      deps,
      jobId,
      "MODEL_UNAVAILABLE",
      `Unknown model ${job.model_key}`,
    );
    return 200;
  }

  let requestId: string;
  try {
    const uploads = await getUserUploads(deps.db, job.user_id, job.upload_ids);
    const byId = new Map(uploads.map((u) => [u.id, u]));
    const inputUrls: string[] = [];
    for (const id of job.upload_ids) {
      const upload = byId.get(id);
      if (!upload) throw new Error(`Upload ${id} missing for job ${jobId}`);
      inputUrls.push(
        await deps.storage.createSignedUrl(
          deps.config.STORAGE_BUCKET_INPUTS,
          upload.path,
          INPUT_URL_TTL_SECONDS,
        ),
      );
    }
    const { prompt, options } = job.input as {
      prompt: string;
      options: never;
    };
    ({ requestId } = await deps.fal.submit(
      model.falModelId,
      model.buildInput({ prompt, options, inputUrls }),
      falWebhookUrl(deps.config, jobId),
    ));
  } catch (err) {
    if (err instanceof FalError && !err.retryable) {
      await failSubmitting(deps, jobId, "SUBMIT_REJECTED", err.message);
      return 200;
    }
    // Everything else (retryable fal/storage errors and unexpected ones) is
    // capped by the attempts policy so a poisoned job can't loop forever.
    const detail = err instanceof Error ? err.message : String(err);
    if (job.attempts >= MAX_SUBMIT_ATTEMPTS) {
      await failSubmitting(deps, jobId, "SUBMIT_FAILED", detail);
      return 200;
    }
    const t = deps.clock.now();
    const requeued = await transitionJob(
      deps.db,
      jobId,
      ["submitting"],
      { status: "queued", lease_expires_at: null },
      t,
    );
    if (!requeued) {
      deps.logger.info("Job changed meanwhile; not requeued", { jobId });
      return 200;
    }
    deps.logger.info("Job state changed", {
      jobId,
      from: "submitting",
      to: "queued",
      attempts: job.attempts,
    });
    deps.logger.warn("Submit failed; will retry", {
      jobId,
      attempts: job.attempts,
      err,
    });
    return 503;
  }

  const result = await saveRequestId(deps, jobId, requestId);
  if ("threw" in result) {
    try {
      const now = await getJob(deps.db, jobId);
      if (now?.status === "submitted" && now.fal_request_id === requestId) {
        deps.logger.info("Request id was saved despite the error", {
          jobId,
          requestId,
        });
        return 200;
      }
    } catch {
      // Best effort: fall through and cancel.
    }
    await cancelQuietly(deps, jobId, model.falModelId, requestId);
    deps.logger.error("couldn't save the fal request id", {
      jobId,
      requestId,
      err: result.threw,
    });
    return 503;
  }
  if (result.saved) {
    deps.logger.info("Job state changed", {
      jobId,
      from: "submitting",
      to: "submitted",
      attempts: job.attempts,
    });
    return 200;
  }

  const current = await getJob(deps.db, jobId);
  if (current?.fal_request_id === requestId) {
    deps.logger.info("Webhook already linked our fal request", {
      jobId,
      requestId,
    });
    return 200;
  }
  await cancelQuietly(deps, jobId, model.falModelId, requestId);
  deps.logger.warn("Duplicate fal submit; cancelled our request", {
    jobId,
    requestId,
    orphanFalRequest: true,
  });
  return 200;
}
