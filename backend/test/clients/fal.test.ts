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
  function recordingFetch(respond: () => Response): {
    fetchFn: typeof fetch;
    calls: Array<{ url: string; init: RequestInit }>;
  } {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return respond();
    }) as unknown as typeof fetch;
    return { fetchFn, calls };
  }

  it("submits exactly once with a direct POST and returns the request id", async () => {
    const { fetchFn, calls } = recordingFetch(
      () => new Response(JSON.stringify({ request_id: "abc" })),
    );
    const client = createFalClient(config, stub({}), fetchFn);
    expect(
      await client.submit("fal-ai/m/edit", { p: 1 }, "https://hook/x?a=b"),
    ).toEqual({ requestId: "abc" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      `https://queue.fal.run/fal-ai/m/edit?fal_webhook=${encodeURIComponent("https://hook/x?a=b")}`,
    );
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toEqual({
      Authorization: `Key ${config.FAL_KEY}`,
      "Content-Type": "application/json",
    });
    expect(calls[0]?.init.body).toBe(JSON.stringify({ p: 1 }));
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [401, true],
    [403, true],
    [429, true],
    [502, true],
    [503, true],
    [400, false],
    [422, false],
  ])(
    "maps submit HTTP %i to retryable=%s without retrying",
    async (status, retryable) => {
      const { fetchFn, calls } = recordingFetch(
        () => new Response("nope", { status }),
      );
      const client = createFalClient(config, stub({}), fetchFn);
      const err = await client.submit("m", {}, "u").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FalError);
      expect((err as FalError).retryable).toBe(retryable);
      expect((err as FalError).status).toBe(status);
      expect(calls).toHaveLength(1);
    },
  );

  it("maps a submit network error to retryable", async () => {
    const fetchFn = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const client = createFalClient(config, stub({}), fetchFn);
    const err = await client.submit("m", {}, "u").catch((e: unknown) => e);
    expect((err as FalError).retryable).toBe(true);
  });

  it("rejects a submit response without request_id as non-retryable", async () => {
    const { fetchFn } = recordingFetch(() => new Response("{}"));
    const client = createFalClient(config, stub({}), fetchFn);
    const err = await client.submit("m", {}, "u").catch((e: unknown) => e);
    expect((err as FalError).retryable).toBe(false);
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

  it.each([401, 403])(
    "throws a retryable error for a %i result (bad FAL_KEY)",
    async (status) => {
      const client = createFalClient(
        config,
        stub({
          result: async () => {
            throw apiError(status);
          },
        }),
      );
      const err = await client.result("m", "r").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FalError);
      expect((err as FalError).retryable).toBe(true);
    },
  );

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
