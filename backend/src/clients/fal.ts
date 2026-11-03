import { ApiError, createFalClient as createSdkClient } from "@fal-ai/client";
import type { Config } from "../config.js";

export const FAL_TIMEOUT_MS = 30_000;

export type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";

export type FalResult =
  { ok: true; data: unknown } | { ok: false; message: string };

export class FalError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FalError";
  }
}

export interface FalClient {
  submit(
    modelId: string,
    input: Record<string, unknown>,
    webhookUrl: string,
  ): Promise<{ requestId: string }>;
  status(modelId: string, requestId: string): Promise<FalStatus>;
  result(modelId: string, requestId: string): Promise<FalResult>;
  cancel(modelId: string, requestId: string): Promise<void>;
}

/** The slice of the SDK client this module uses (stubbed in tests). */
export type FalSdk = Pick<ReturnType<typeof createSdkClient>, "queue">;

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toFalError(err: unknown): FalError {
  if (err instanceof FalError) return err;
  if (err instanceof ApiError) {
    const s = err.status;
    return new FalError(err.message, s === 429 || s >= 500, s);
  }
  // Network failures and timeouts.
  return new FalError(messageOf(err), true);
}

export function createFalClient(config: Config, sdk?: FalSdk): FalClient {
  const queue = (sdk ?? createSdkClient({ credentials: config.FAL_KEY })).queue;

  async function call<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new FalError("fal request timed out", true));
      }, FAL_TIMEOUT_MS);
    });
    try {
      return await Promise.race([fn(controller.signal), timeout]);
    } catch (err) {
      throw toFalError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async submit(modelId, input, webhookUrl) {
      const res = await call((abortSignal) =>
        queue.submit(modelId, { input, webhookUrl, abortSignal }),
      );
      return { requestId: res.request_id };
    },
    async status(modelId, requestId) {
      const res = await call((abortSignal) =>
        queue.status(modelId, { requestId, abortSignal }),
      );
      return res.status;
    },
    async result(modelId, requestId) {
      try {
        const res = await call((abortSignal) =>
          queue.result(modelId, { requestId, abortSignal }),
        );
        return { ok: true, data: res.data };
      } catch (err) {
        if (
          err instanceof FalError &&
          !err.retryable &&
          err.status !== undefined
        ) {
          return { ok: false, message: err.message };
        }
        throw err;
      }
    },
    async cancel(modelId, requestId) {
      await call((abortSignal) =>
        queue.cancel(modelId, { requestId, abortSignal }),
      );
    },
  };
}
