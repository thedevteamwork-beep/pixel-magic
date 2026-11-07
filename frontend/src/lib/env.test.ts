import { afterEach, describe, expect, it, vi } from "vitest";
import { publicEnv } from "@/lib/env";

function setEnv(apiUrl: string) {
  vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
}

describe("publicEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("throws naming the missing key", () => {
    setEnv("http://localhost:8080");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => publicEnv()).toThrow("Missing env NEXT_PUBLIC_SUPABASE_URL");
  });

  it("strips a trailing slash from apiUrl", () => {
    setEnv("http://localhost:8080/");
    expect(publicEnv().apiUrl).toBe("http://localhost:8080");
  });
});
