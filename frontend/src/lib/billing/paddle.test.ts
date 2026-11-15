import { afterEach, describe, expect, it, vi } from "vitest";
import type { Paddle } from "@paddle/paddle-js";
import { PaddleUnavailableError, loadPaddle } from "@/lib/billing/paddle";

describe("loadPaddle", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects when the token is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "");
    const init = vi.fn();
    await expect(loadPaddle({ init })).rejects.toMatchObject({ reason: "config" });
    expect(init).not.toHaveBeenCalled();
  });

  it("rejects when init throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_abc");
    const init = vi.fn().mockRejectedValue(new Error("blocked"));
    await expect(loadPaddle({ init })).rejects.toBeInstanceOf(PaddleUnavailableError);
    await expect(loadPaddle({ init })).rejects.toMatchObject({ reason: "load" });
  });

  it("rejects when init resolves undefined", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_abc");
    const init = vi.fn().mockResolvedValue(undefined);
    await expect(loadPaddle({ init })).rejects.toBeInstanceOf(PaddleUnavailableError);
  });

  it("resolves the instance and passes the environment and token", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_abc");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "");
    const instance = {} as Paddle;
    const init = vi.fn().mockResolvedValue(instance);
    await expect(loadPaddle({ init })).resolves.toBe(instance);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ environment: "sandbox", token: "test_abc" }));
  });
});
