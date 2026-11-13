import { describe, expect, it } from "vitest";
import { authCallbackUrl, authPath, type AuthMode } from "./paths";

const origin = "https://pixel.example";
const next = "/creations?kind=video&cursor=a%2Fb#latest";

describe("auth paths", () => {
  it.each<AuthMode>(["sign-in", "sign-up", "forgot-password", "reset-password"])(
    "preserves the full local destination when switching to %s",
    (mode) => {
      const url = new URL(authPath(mode, next), origin);
      expect(url.pathname).toBe(`/${mode}`);
      expect(url.searchParams.get("next")).toBe(next);
      expect([...url.searchParams.keys()]).toEqual(["next"]);
      expect(url.hash).toBe("");
    },
  );

  it("uses the PKCE callback at the supplied origin without leaking the origin path/query", () => {
    expect(authCallbackUrl(`${origin}/sign-up?tracking=campaign`, next)).toBe(
      "https://pixel.example/auth/callback?next=%2Fcreations%3Fkind%3Dvideo%26cursor%3Da%252Fb%23latest",
    );
  });

  it("marks only recovery callbacks and retains the destination as one parameter", () => {
    const normal = new URL(authCallbackUrl(origin, next));
    const recovery = new URL(authCallbackUrl(origin, next, true));

    expect(normal.searchParams.has("flow")).toBe(false);
    expect(recovery.pathname).toBe("/auth/callback");
    expect(recovery.searchParams.get("flow")).toBe("recovery");
    expect(recovery.searchParams.get("next")).toBe(next);
    expect([...recovery.searchParams.keys()]).toEqual(["next", "flow"]);
  });

  it.each([
    "https://outside.example",
    "//outside.example",
    "/\\outside.example",
    "/\n/outside.example",
    "",
    null,
    undefined,
  ])("falls back safely in both auth links and callbacks for %j", (unsafeNext) => {
    const auth = new URL(authPath("sign-in", unsafeNext), origin);
    const callback = new URL(authCallbackUrl(origin, unsafeNext, true));

    expect(auth.origin).toBe(origin);
    expect(auth.searchParams.get("next")).toBe("/");
    expect(callback.origin).toBe(origin);
    expect(callback.searchParams.get("next")).toBe("/");
    expect(callback.searchParams.get("flow")).toBe("recovery");
  });
});
