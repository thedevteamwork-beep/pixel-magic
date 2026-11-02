import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PADDLE_TIMEOUT_MS,
  PaddleProviderError,
  withTimeout,
} from "../../src/clients/paddle.js";

describe("withTimeout (Paddle SDK calls)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is 10 seconds", () => {
    expect(PADDLE_TIMEOUT_MS).toBe(10_000);
  });

  it("rejects a call that never answers with PaddleProviderError after 10 s", async () => {
    let settled: unknown = "pending";
    const call = withTimeout(new Promise<never>(() => {}));
    call.catch((err: unknown) => {
      settled = err;
    });
    await vi.advanceTimersByTimeAsync(PADDLE_TIMEOUT_MS - 1);
    expect(settled).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBeInstanceOf(PaddleProviderError);
    expect((settled as Error).message).toBe("Paddle request timed out");
  });

  it("returns a timely answer and clears its timer", async () => {
    await expect(withTimeout(Promise.resolve("ok"))).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes a timely failure through and clears its timer", async () => {
    const boom = new Error("boom");
    await expect(withTimeout(Promise.reject(boom))).rejects.toBe(boom);
    expect(vi.getTimerCount()).toBe(0);
  });
});
