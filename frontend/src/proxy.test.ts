import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

type CookieAdapter = {
  cookies: {
    setAll: (
      cookies: { name: string; value: string; options?: { path?: string; maxAge?: number } }[],
      headers: Record<string, string>,
    ) => void;
  };
};
let adapter: CookieAdapter;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  mocks.createServerClient.mockImplementation((_url: string, _key: string, options: CookieAdapter) => {
    adapter = options;
    return { auth: { getUser: mocks.getUser } };
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("auth proxy", () => {
  it.each(["/api/demo/image-generation", "/api/demo/video-generation", "/api/demo/image-upscale"])("keeps %s independent of authentication", async (path) => {
    const response = await proxy(new NextRequest(`http://localhost:3000${path}`, { method: "POST" }));
    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("allows access without clients or environment reads when Supabase is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await proxy(new NextRequest("http://localhost:3000/generate?job=abc"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("preserves protected paths and queries for signed-out visitors", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/creations?cursor=abc"));
    const url = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("next")).toBe("/creations?cursor=abc");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("carries refreshed cookies and Supabase cache headers onto login redirects", async () => {
    mocks.getUser.mockImplementation(async () => {
      adapter.cookies.setAll([{ name: "sb-session", value: "", options: { path: "/", maxAge: 0 } }], {
        "Cache-Control": "private, no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      });
      return { data: { user: null } };
    });

    const response = await proxy(new NextRequest("http://localhost:3000/account"));

    expect(response.cookies.get("sb-session")?.value).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache, no-store, max-age=0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("allows signed-in visitors to protected nested pages", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const response = await proxy(new NextRequest("http://localhost:3000/checkout/finish?transaction=abc"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps public pages accessible while signed out", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/pricing"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy asset matching", () => {
  it.each([
    "/media/landing/desert.mp4",
    "/media/showreel.webm",
    "/images/poster.avif",
    "/icons/brand.ico",
    "/media/landing/flowers.jpg",
    "/_next/static/chunks/app.js",
  ])("does not verify sessions for %s", (url) => {
    expect(doesProxyMatch({ config, nextConfig: {}, url })).toBe(false);
  });

  it.each(["/", "/generate?job=abc", "/account", "/auth/callback?code=abc"])("continues matching %s", (url) => {
    expect(doesProxyMatch({ config, nextConfig: {}, url })).toBe(true);
  });
});
