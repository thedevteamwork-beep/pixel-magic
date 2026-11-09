import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupabaseEnabled, paddleEnv, publicEnv } from "@/lib/env";

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

describe("Supabase switch", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is on when NEXT_PUBLIC_SUPABASE_ENABLED is not set", () => {
    setEnv("http://localhost:8080");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "");
    expect(isSupabaseEnabled()).toBe(true);
    expect(publicEnv().supabaseEnabled).toBe(true);
  });

  it("is on for any value except false", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "true");
    expect(isSupabaseEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "0");
    expect(isSupabaseEnabled()).toBe(true);
  });

  it("is off when NEXT_PUBLIC_SUPABASE_ENABLED is false", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    expect(isSupabaseEnabled()).toBe(false);
  });

  it("does not need the Supabase keys while it is off", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(publicEnv()).toEqual({
      apiUrl: "http://localhost:8080",
      supabaseEnabled: false,
      supabaseUrl: "",
      supabasePublishableKey: "",
    });
  });

  it("still needs the API URL while it is off", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    expect(() => publicEnv()).toThrow("Missing env NEXT_PUBLIC_API_URL");
  });
});

describe("paddleEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to sandbox", () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_abc");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "");
    expect(paddleEnv()).toEqual({ clientToken: "test_abc", environment: "sandbox" });
  });

  it("accepts production", () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "live_abc");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "production");
    expect(paddleEnv().environment).toBe("production");
  });

  it("throws on an unknown environment", () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_abc");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "live");
    expect(() => paddleEnv()).toThrow("NEXT_PUBLIC_PADDLE_ENV");
  });

  it("throws on a missing token", () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "");
    expect(() => paddleEnv()).toThrow("Missing env NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  });
});
