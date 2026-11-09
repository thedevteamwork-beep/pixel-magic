import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";

describe("auth callback with Supabase off", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends the user home without exchanging the code", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/generate"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
