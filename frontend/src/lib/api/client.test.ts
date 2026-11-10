import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "@/lib/api/client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeClient(fetchFn: typeof fetch, token: string | null = "tok") {
  return createApiClient({
    baseUrl: "http://api.test",
    getAccessToken: async () => token,
    fetchFn,
  });
}

describe("api client", () => {
  it("sends the bearer token and idempotency key", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
    const result = await makeClient(fetchFn as unknown as typeof fetch).post(
      "/v1/jobs",
      { a: 1 },
      { idempotencyKey: "key-1" },
    );
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://api.test/v1/jobs");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(headers["Idempotency-Key"]).toBe("key-1");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("maps a JSON error body to ApiError", async () => {
    const body = { code: "VALIDATION_FAILED", message: "Bad", meta: [1] };
    const fetchFn = async () => jsonResponse(body, 422);
    const error = await makeClient(fetchFn)
      .get("/x")
      .catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Bad",
      meta: [1],
    });
  });

  it("maps a non-JSON 502 to HTTP_ERROR", async () => {
    const fetchFn = async () =>
      new Response("<html>Bad Gateway</html>", { status: 502 });
    const error = await makeClient(fetchFn)
      .get("/x")
      .catch((e) => e);
    expect(error).toMatchObject({
      status: 502,
      code: "HTTP_ERROR",
      message: "Request failed (502)",
    });
  });

  it("maps a fetch rejection to NETWORK_ERROR", async () => {
    const fetchFn = async () => {
      throw new TypeError("fetch failed");
    };
    const error = await makeClient(fetchFn)
      .get("/x")
      .catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      message: "fetch failed",
    });
  });

  it("re-throws an abort unchanged", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const fetchFn = async () => {
      throw abort;
    };
    const error = await makeClient(fetchFn)
      .get("/x")
      .catch((e) => e);
    expect(error).toBe(abort);
  });

  it("sends DELETE with the bearer token and parses the JSON", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ action: "reverted" }));
    const result = await makeClient(fetchFn as unknown as typeof fetch).delete(
      "/v1/billing/subscription/change",
    );
    expect(result).toEqual({ action: "reverted" });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/v1/billing/subscription/change");
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
});
