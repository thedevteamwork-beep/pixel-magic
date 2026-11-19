import { describe, expect, it } from "vitest";
import { fluxSchnell, jobView } from "@/lib/generate/fixtures";
import { composeImageGuidance, composeImagePrompt } from "./guidance";
import { toStudioModel } from "./models";
import { downloadName, isActiveJob, jobToResults, mergeResults, urlExpired } from "./results";

const models = [toStudioModel(fluxSchnell)];
const completed = jobView("completed", {
  jobId: "1234567890ab",
  input: {
    prompt: composeImagePrompt("A rose", composeImageGuidance("Analog", { lighting: "none", palette: "none" }, [])),
    image_size: "portrait_4_3",
    num_images: 2,
  },
  completedAt: "2026-11-15T10:01:00.000Z",
  outputs: [
    { index: 0, mimeType: "image/jpeg", url: "https://store.test/0.jpg", expiresAt: "2026-11-15T11:00:00.000Z" },
    { index: 1, mimeType: "image/png", url: "https://store.test/1.png", expiresAt: "2026-11-15T11:00:00.000Z" },
  ],
});

describe("image job results", () => {
  it("turns each output of a completed job into a result with its brief and shape", () => {
    const [first, second] = jobToResults(completed, models);
    expect(first).toMatchObject({
      id: "1234567890ab:0",
      prompt: "A rose",
      modelName: "FLUX Schnell",
      aspectRatio: "3:4",
      sizeLabel: "3:4",
      creditCost: 2,
      batchSize: 2,
      createdAt: "2026-11-15T10:01:00.000Z",
      favorite: false,
    });
    expect(first.guidance).toContain("film grain");
    expect(second.mimeType).toBe("image/png");
  });

  it("has no results for unfinished jobs or outputs without a URL", () => {
    expect(jobToResults(jobView("submitted"), models)).toEqual([]);
    expect(jobToResults({ ...completed, outputs: [{ index: 0, mimeType: "image/jpeg" }] }, models)).toEqual([]);
    expect(isActiveJob(jobView("finalizing"))).toBe(true);
    expect(isActiveJob(jobView("failed"))).toBe(false);
  });

  it("merges newer copies over older ones, newest first", () => {
    const [a, b] = jobToResults(completed, models);
    const older = { ...a, id: "old:0", createdAt: "2026-11-14T00:00:00.000Z" };
    const refreshed = { ...a, url: "https://store.test/fresh.jpg" };
    expect(mergeResults([older, a, b], [refreshed]).map((item) => [item.id, item.url])).toEqual([
      ["1234567890ab:0", "https://store.test/fresh.jpg"],
      ["1234567890ab:1", "https://store.test/1.png"],
      ["old:0", a.url],
    ]);
  });

  it("knows when a signed URL needs refreshing and names downloads", () => {
    const [a, b] = jobToResults(completed, models);
    expect(urlExpired(a, Date.parse("2026-11-15T10:58:30.000Z"))).toBe(false);
    expect(urlExpired(a, Date.parse("2026-11-15T10:59:30.000Z"))).toBe(true);
    expect(downloadName(b)).toBe("pixel-magic-12345678-2.png");
  });
});
