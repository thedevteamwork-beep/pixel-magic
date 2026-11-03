import {
  FalError,
  type FalClient,
  type FalResult,
  type FalStatus,
} from "../../src/clients/fal.js";

type Method = keyof FalClient;

export class FakeFal implements FalClient {
  calls: Array<{ method: Method; args: unknown[] }> = [];
  statuses = new Map<string, FalStatus>();
  results = new Map<string, FalResult>();
  private counter = 0;
  private failures = new Map<Method, { error: FalError; times: number }>();

  failNext(method: Method, error: FalError, times = 1): void {
    this.failures.set(method, { error, times });
  }

  private enter(method: Method, args: unknown[]): void {
    this.calls.push({ method, args });
    const f = this.failures.get(method);
    if (f && f.times > 0) {
      f.times -= 1;
      throw f.error;
    }
  }

  async submit(
    modelId: string,
    input: Record<string, unknown>,
    webhookUrl: string,
  ): Promise<{ requestId: string }> {
    this.enter("submit", [modelId, input, webhookUrl]);
    this.counter += 1;
    return { requestId: `req_${this.counter}` };
  }

  async status(modelId: string, requestId: string): Promise<FalStatus> {
    this.enter("status", [modelId, requestId]);
    return this.statuses.get(requestId) ?? "IN_PROGRESS";
  }

  async result(modelId: string, requestId: string): Promise<FalResult> {
    this.enter("result", [modelId, requestId]);
    const r = this.results.get(requestId);
    if (!r) throw new Error("FakeFal: no result configured");
    return r;
  }

  async cancel(modelId: string, requestId: string): Promise<void> {
    this.enter("cancel", [modelId, requestId]);
  }
}
