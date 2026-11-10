import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/safeNext";

describe("safeNext", () => {
  it("keeps a same-site path with its query", () => {
    expect(safeNext("/generate?job=1")).toBe("/generate?job=1");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "/a?u=http://evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\t\\evil.com", "", null, undefined])(
    "falls back to the landing page for %s",
    (value) => {
      expect(safeNext(value)).toBe("/");
    },
  );
});
