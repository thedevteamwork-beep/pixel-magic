import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

let cacheHeaders: Record<string, string>;

function callback(params: Record<string, string> = {}) {
  const url = new URL("/auth/callback", "http://localhost:3000");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return GET(new Request(url));
}

function destination(response: Response) {
  return new URL(response.headers.get("location")!);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "true");
  cacheHeaders = {};
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.createClient.mockImplementation(async (onCacheHeaders?: (headers: Record<string, string>) => void) => ({
    auth: {
      exchangeCodeForSession: (code: string) => {
        onCacheHeaders?.(cacheHeaders);
        return mocks.exchangeCodeForSession(code);
      },
    },
  }));
});

afterEach(() => vi.unstubAllEnvs());

describe("auth callback", () => {
  it("goes home without creating a client when Supabase is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await callback({ code: "abc", next: "/generate" });

    expect(response.status).toBe(307);
    expect(destination(response).href).toBe("http://localhost:3000/");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("exchanges the code and preserves the requested path and query", async () => {
    const response = await callback({ code: "abc", next: "/creations?cursor=2" });

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(destination(response).href).toBe("http://localhost:3000/creations?cursor=2");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects an external post-auth destination", async () => {
    const response = await callback({ code: "abc", next: "https://evil.example" });
    expect(destination(response).href).toBe("http://localhost:3000/");
  });

  it("returns to the landing page after authentication without a requested destination", async () => {
    const response = await callback({ code: "abc" });
    expect(destination(response).href).toBe("http://localhost:3000/");
  });

  it("takes recovery sessions to password reset while keeping the final destination", async () => {
    const response = await callback({ code: "recovery-code", flow: "recovery", next: "/account?tab=plan" });
    const url = destination(response);

    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("next")).toBe("/account?tab=plan");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
  });

  it.each([
    { flow: "", retry: "/sign-in" },
    { flow: "recovery", retry: "/forgot-password" },
  ])("keeps the destination when $retry must retry a rejected code", async ({ flow, retry }) => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: "Expired code" } });
    const response = await callback({ code: "expired", flow, next: "/pricing" });
    const url = destination(response);

    expect(url.pathname).toBe(retry);
    expect(url.searchParams.get("next")).toBe("/pricing");
    expect(url.searchParams.get("error")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each([
    { flow: "", retry: "/sign-in" },
    { flow: "recovery", retry: "/forgot-password" },
  ])("returns to $retry without creating a client when no code exists", async ({ flow, retry }) => {
    const response = await callback({ flow, next: "/account" });
    const url = destination(response);

    expect(url.pathname).toBe(retry);
    expect(url.searchParams.get("next")).toBe("/account");
    expect(url.searchParams.get("error")).toBe("1");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("handles a thrown exchange error with the recovery retry flow", async () => {
    mocks.exchangeCodeForSession.mockRejectedValue(new Error("Network unavailable"));
    const response = await callback({ code: "abc", flow: "recovery", next: "/creations" });
    const url = destination(response);

    expect(url.pathname).toBe("/forgot-password");
    expect(url.searchParams.get("next")).toBe("/creations");
    expect(url.searchParams.get("error")).toBe("1");
  });

  it("handles a thrown client error without exposing its details", async () => {
    mocks.createClient.mockRejectedValue(new Error("Internal configuration error"));
    const response = await callback({ code: "abc", next: "/pricing" });
    const url = destination(response);

    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("next")).toBe("/pricing");
    expect(url.searchParams.get("error")).toBe("1");
    expect(url.href).not.toContain("configuration");
  });

  it.each([false, true])("preserves Supabase cache headers when exchange fails: %s", async (fails) => {
    cacheHeaders = { "Cache-Control": "private, no-cache, no-store, max-age=0", Pragma: "no-cache", Expires: "0" };
    mocks.exchangeCodeForSession.mockResolvedValue({ error: fails ? { message: "Expired" } : null });

    const response = await callback({ code: "abc", next: "/generate" });

    for (const [key, value] of Object.entries(cacheHeaders)) expect(response.headers.get(key)).toBe(value);
  });
});
