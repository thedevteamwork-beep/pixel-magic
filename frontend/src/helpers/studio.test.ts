import { describe, expect, it } from "vitest";
import { cssAspectRatio } from "./studio";

describe("cssAspectRatio", () => {
  it("turns a ratio into a CSS aspect-ratio value", () => {
    expect(cssAspectRatio("9:16")).toBe("9 / 16");
    expect(cssAspectRatio("4:5")).toBe("4 / 5");
  });

  it("falls back to a square for anything it can't read", () => {
    expect(cssAspectRatio("bad")).toBe("1 / 1");
    expect(cssAspectRatio("0:5")).toBe("1 / 1");
  });
});
