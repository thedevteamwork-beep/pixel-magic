import { z } from "zod";
import { FalError } from "../../clients/fal.js";
import {
  FalWebhookBody,
  verifyFalWebhook,
  type FalWebhookHeaders,
} from "../../clients/falWebhook.js";
import type { Deps } from "../../deps.js";
import {
  getJob,
  getJobByFalRequestId,
  linkFalRequest,
} from "../../db/repositories/jobs.repo.js";
import { recordProviderEvent } from "../../db/repositories/providerEvents.repo.js";
import type { JobRow } from "../../db/rows.js";
import { getModel } from "../../models/registry.js";

const uuid = z.string().uuid();

type LinkResult = { job: JobRow } | "orphan" | "retry";

function orphan(deps: Deps, jobId: string, requestId: string): "orphan" {
  deps.logger.warn("fal webhook matches no job", {
    jobId,
    requestId,
    orphanFalRequest: true,
  });
  return "orphan";
}

/**
 * Links a request fal never reported back to us (the save after submit failed)
 * to its job. fal signs webhooks for every customer, so first prove with our
 * own credentials that the request is ours.
 */
async function linkViaJobId(
  deps: Deps,
  jobId: string,
  requestId: string,
): Promise<LinkResult> {
  const job = await getJob(deps.db, jobId);
  if (job?.fal_request_id === requestId) return { job };
  if (!job || job.status !== "submitting" || job.fal_request_id !== null) {
    return orphan(deps, jobId, requestId);
  }
  const model = getModel(job.model_key);
  if (!model) return orphan(deps, jobId, requestId);
  try {
    await deps.fal.status(model.falModelId, requestId);
  } catch (err) {
    // 401/403 mean our own key is bad: never link, let fal retry.
    const authFailure =
      err instanceof FalError && (err.status === 401 || err.status === 403);
    if (err instanceof FalError && !err.retryable && !authFailure) {
      return orphan(deps, jobId, requestId);
    }
    deps.logger.warn("Couldn't verify the fal request; asking fal to retry", {
      jobId,
      requestId,
      err,
    });
    return "retry";
  }
  const linked = await linkFalRequest(
    deps.db,
    jobId,
    requestId,
    deps.clock.now(),
  );
  if (linked) {
    deps.logger.info("Job state changed", {
      jobId,
      from: "submitting",
      to: "submitted",
    });
    return { job: linked };
  }
  // Lost the race: a concurrent delivery or the worker may have linked it.
  const current = await getJobByFalRequestId(deps.db, requestId);
  return current ? { job: current } : orphan(deps, jobId, requestId);
}

export async function handleFalWebhook(
  deps: Deps,
  rawBody: Buffer,
  headers: FalWebhookHeaders,
  jobIdParam: string | undefined,
): Promise<200 | 401 | 503> {
  let keyLoadError: unknown;
  let verified = false;
  try {
    verified = await verifyFalWebhook({
      headers,
      rawBody,
      now: deps.clock.now(),
      keys: async () => {
        try {
          return await deps.falKeys();
        } catch (err) {
          keyLoadError = err;
          throw err;
        }
      },
      expectedUserId: deps.config.FAL_WEBHOOK_USER_ID,
    });
  } catch (err) {
    if (keyLoadError === undefined) throw err;
  }
  if (keyLoadError !== undefined) {
    // Not a bad signature: ask fal to retry once the keys load again.
    deps.logger.error("Couldn't load fal webhook signing keys", {
      err: keyLoadError,
    });
    return 503;
  }
  if (!verified) return 401;
  if (!deps.config.FAL_WEBHOOK_USER_ID) {
    deps.logger.info("fal webhook from user (set FAL_WEBHOOK_USER_ID)", {
      falUserId: headers.userId,
      requestId: headers.requestId,
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString("utf8"));
  } catch {
    json = undefined;
  }
  const parsed = FalWebhookBody.safeParse(json);
  if (!parsed.success) {
    deps.logger.error("Signed fal webhook has an unexpected body", {
      requestId: headers.requestId,
      issues: parsed.error.issues,
    });
    return 200;
  }
  const body = parsed.data;
  if (body.request_id !== headers.requestId) {
    deps.logger.error(
      "fal webhook body request id differs from signed header",
      {
        headerRequestId: headers.requestId,
        bodyRequestId: body.request_id,
      },
    );
    return 401;
  }

  await recordProviderEvent(deps.db, {
    provider: "fal",
    requestId: body.request_id,
    status: body.status,
    payload: json,
    now: deps.clock.now(),
  });

  let job = await getJobByFalRequestId(deps.db, body.request_id);
  if (!job) {
    const idParam = uuid.safeParse(jobIdParam);
    if (!idParam.success) {
      deps.logger.info("fal webhook arrived before its job was linked", {
        requestId: body.request_id,
      });
      return 503;
    }
    const result = await linkViaJobId(deps, idParam.data, body.request_id);
    if (result === "retry") return 503;
    if (result === "orphan") return 200;
    job = result.job;
  }

  if (job.status === "completed" || job.status === "failed") return 200;

  try {
    await deps.queue.enqueue("finalize", job.id, "0");
  } catch (err) {
    deps.logger.error("Failed to enqueue finalize task", {
      jobId: job.id,
      err,
    });
    return 503;
  }
  return 200;
}
