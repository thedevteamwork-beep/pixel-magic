import { describe, expect, it } from "vitest";
import { portraitFileName } from "./download";

describe("portraitFileName", () => {
  it("names the file after the influencer, with the image's own extension", () => {
    expect(portraitFileName("Mira Kapoor", "https://storage.test/u1/j1/0.png?token=abc")).toBe(
      "pixel-magic-mira-kapoor.png",
    );
    expect(portraitFileName("Puppy coach", "/_next/static/media/puppy.jpg")).toBe("pixel-magic-puppy-coach.jpg");
  });

  it("keeps only letters and numbers in the name", () => {
    expect(portraitFileName("  Zoë & Co!  ", "https://x/a.webp")).toBe("pixel-magic-zo-co.webp");
  });

  it("falls back to a plain name and a JPEG extension", () => {
    expect(portraitFileName("", "https://x/image")).toBe("pixel-magic-influencer.jpg");
  });
});
