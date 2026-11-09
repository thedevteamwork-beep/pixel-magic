import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

describe("proxy with Supabase off", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets a signed-out visitor through to /generate", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    // No API URL and no Supabase keys: the proxy must not even read them.
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await proxy(new NextRequest("http://localhost:3000/generate?job=abc"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
