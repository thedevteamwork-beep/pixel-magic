import type { Config } from "../../config.js";
import { FalError } from "../../clients/fal.js";
import { StorageError } from "../../clients/storage.js";
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
  if (!job) return 200;

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
    const retryable =
      err instanceof StorageError || (err instanceof FalError && err.retryable);
    if (retryable) {
      if (job.attempts < MAX_SUBMIT_ATTEMPTS) {
        const t = deps.clock.now();
        await transitionJob(
          deps.db,
          jobId,
          ["submitting"],
          { status: "queued", lease_expires_at: null },
          t,
        );
        deps.logger.warn("Submit failed; will retry", {
          jobId,
          attempts: job.attempts,
          err,
        });
        return 503;
      }
      await failSubmitting(deps, jobId, "SUBMIT_FAILED", String(err));
      return 200;
    }
    if (err instanceof FalError) {
      await failSubmitting(deps, jobId, "SUBMIT_REJECTED", err.message);
      return 200;
    }
    throw err;
  }

  const result = await saveRequestId(deps, jobId, requestId);
  if ("threw" in result) {
    await cancelQuietly(deps, jobId, model.falModelId, requestId);
    deps.logger.error("couldn't save the fal request id", {
      jobId,
      requestId,
      err: result.threw,
    });
    return 503;
  }
  if (result.saved) return 200;

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
