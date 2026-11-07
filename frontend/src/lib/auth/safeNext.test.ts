import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/safeNext";

describe("safeNext", () => {
  it("keeps a same-site path with its query", () => {
    expect(safeNext("/generate?job=1")).toBe("/generate?job=1");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "/a?u=http://evil.com", "", null, undefined])(
    "falls back to /generate for %s",
    (value) => {
      expect(safeNext(value)).toBe("/generate");
    },
  );
});
