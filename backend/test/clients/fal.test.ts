import { ApiError, ValidationError } from "@fal-ai/client";
import { describe, expect, it } from "vitest";
import { createFalClient, FalError } from "../../src/clients/fal.js";
import { makeDeps } from "../helpers/app.js";

type Queue = Parameters<typeof createFalClient>[1] extends infer S
  ? NonNullable<S> extends { queue: infer Q }
    ? Q
    : never
  : never;

function stub(queue: Partial<Record<keyof Queue, unknown>>) {
  return { queue } as unknown as NonNullable<
    Parameters<typeof createFalClient>[1]
  >;
}

const config = makeDeps().deps.config;
const apiError = (status: number) =>
  status === 422
    ? new ValidationError({ message: "bad", status, body: { detail: [] } })
    : new ApiError({ message: `http ${status}`, status });

describe("createFalClient", () => {
  it("submits with webhookUrl and returns the request id", async () => {
    const seen: unknown[] = [];
    const client = createFalClient(
      config,
      stub({
        submit: async (id: string, opts: unknown) => {
          seen.push(id, opts);
          return { request_id: "abc" };
        },
      }),
    );
    expect(await client.submit("fal-ai/m", { p: 1 }, "https://hook")).toEqual({
      requestId: "abc",
    });
    expect(seen[0]).toBe("fal-ai/m");
    expect(seen[1]).toMatchObject({
      input: { p: 1 },
      webhookUrl: "https://hook",
    });
  });

  it.each([
    [429, true],
    [503, true],
    [400, false],
    [422, false],
  ])("maps submit HTTP %i to retryable=%s", async (status, retryable) => {
    const client = createFalClient(
      config,
      stub({
        submit: async () => {
          throw apiError(status);
        },
      }),
    );
    const err = await client.submit("m", {}, "u").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FalError);
    expect((err as FalError).retryable).toBe(retryable);
    expect((err as FalError).status).toBe(status);
  });

  it("maps network errors to retryable", async () => {
    const client = createFalClient(
      config,
      stub({
        status: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    );
    const err = await client.status("m", "r").catch((e: unknown) => e);
    expect((err as FalError).retryable).toBe(true);
  });

  it("returns the queue status", async () => {
    const client = createFalClient(
      config,
      stub({ status: async () => ({ status: "COMPLETED" }) }),
    );
    expect(await client.status("m", "r")).toBe("COMPLETED");
  });

  it("returns result data on success", async () => {
    const client = createFalClient(
      config,
      stub({ result: async () => ({ data: { images: [] }, requestId: "r" }) }),
    );
    expect(await client.result("m", "r")).toEqual({
      ok: true,
      data: { images: [] },
    });
  });

  it("maps a failed result to { ok: false, message }", async () => {
    const client = createFalClient(
      config,
      stub({
        result: async () => {
          throw apiError(422);
        },
      }),
    );
    expect(await client.result("m", "r")).toEqual({
      ok: false,
      message: "bad",
    });
  });

  it("throws a retryable error for a 5xx result", async () => {
    const client = createFalClient(
      config,
      stub({
        result: async () => {
          throw apiError(502);
        },
      }),
    );
    const err = await client.result("m", "r").catch((e: unknown) => e);
    expect((err as FalError).retryable).toBe(true);
  });

  it("cancels", async () => {
    let called = false;
    const client = createFalClient(
      config,
      stub({
        cancel: async () => {
          called = true;
        },
      }),
    );
    await client.cancel("m", "r");
    expect(called).toBe(true);
  });
});
