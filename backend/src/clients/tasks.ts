import { createHash } from "node:crypto";
import { CloudTasksClient } from "@google-cloud/tasks";
import type winston from "winston";
import type { Config } from "../config.js";

export type TaskKind = "generate" | "finalize";

export interface TaskQueue {
  /** Enqueues a worker task. A name that already exists counts as success. */
  enqueue(kind: TaskKind, jobId: string, suffix: string): Promise<void>;
}

const GRPC_ALREADY_EXISTS = 6;
const DISPATCH_DEADLINE_SECONDS: Record<TaskKind, number> = {
  generate: 60,
  finalize: 900,
};
const HTTP_DEDUPE_MS = 60 * 60 * 1000;

/** Hashed so ids never leak into queue names; stable for dedupe (spec 7.4). */
export function taskName(
  kind: TaskKind,
  jobId: string,
  suffix: string,
): string {
  return createHash("sha256")
    .update(`${kind}:${jobId}:${suffix}`)
    .digest("hex");
}

function requireCloudSetting(value: string | undefined, key: string): string {
  if (!value) throw new Error(`${key} is required when TASKS_MODE is "cloud"`);
  return value;
}

export function createCloudTasksQueue(
  config: Config,
  client: Pick<
    CloudTasksClient,
    "queuePath" | "taskPath" | "createTask"
  > = new CloudTasksClient(),
): TaskQueue {
  const project = requireCloudSetting(config.GCP_PROJECT_ID, "GCP_PROJECT_ID");
  const region = requireCloudSetting(config.GCP_REGION, "GCP_REGION");
  const serviceAccountEmail = requireCloudSetting(
    config.TASKS_SERVICE_ACCOUNT,
    "TASKS_SERVICE_ACCOUNT",
  );
  const queues: Record<TaskKind, string> = {
    generate: config.TASKS_QUEUE_GENERATION,
    finalize: config.TASKS_QUEUE_FINALIZATION,
  };

  return {
    async enqueue(kind, jobId, suffix) {
      const queue = queues[kind];
      try {
        await client.createTask({
          parent: client.queuePath(project, region, queue),
          task: {
            name: client.taskPath(
              project,
              region,
              queue,
              taskName(kind, jobId, suffix),
            ),
            httpRequest: {
              httpMethod: "POST",
              url: `${config.WORKER_URL}/tasks/${kind}`,
              headers: { "Content-Type": "application/json" },
              body: Buffer.from(JSON.stringify({ jobId })).toString("base64"),
              oidcToken: { serviceAccountEmail, audience: config.WORKER_URL },
            },
            dispatchDeadline: { seconds: DISPATCH_DEADLINE_SECONDS[kind] },
          },
        });
      } catch (err) {
        if ((err as { code?: number }).code === GRPC_ALREADY_EXISTS) return;
        throw err;
      }
    },
  };
}

/** Local mode: POSTs straight to the worker, fire-and-forget. */
export function createHttpQueue(
  config: Config,
  logger: winston.Logger,
): TaskQueue {
  const sent = new Map<string, number>();
  return {
    async enqueue(kind, jobId, suffix) {
      const now = Date.now();
      for (const [name, at] of sent) {
        if (now - at >= HTTP_DEDUPE_MS) sent.delete(name);
      }
      const name = taskName(kind, jobId, suffix);
      if (sent.has(name)) return;
      sent.set(name, now);
      fetch(`${config.WORKER_URL}/tasks/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })
        .then((res) => {
          if (!res.ok) {
            logger.warn("local task POST returned non-2xx", {
              kind,
              jobId,
              status: res.status,
            });
          }
        })
        .catch((err: unknown) => {
          logger.warn("local task POST failed", { kind, jobId, err });
        });
    },
  };
}

export function createTaskQueue(
  config: Config,
  logger: winston.Logger,
): TaskQueue {
  return config.TASKS_MODE === "cloud"
    ? createCloudTasksQueue(config)
    : createHttpQueue(config, logger);
}
