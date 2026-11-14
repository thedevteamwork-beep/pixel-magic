import { describe, expect, it, vi } from "vitest";
import { defaultVideoSettings } from "@/components/video-generator/constants";
import { landingAssets } from "@/constants/landing-media";
import type { VideoGenerationRequest, VideoGenerationResponse, VideoResult } from "@/types/video-generator";
import { requestVideoPreview, VideoPreviewError } from "./client";

const settings: VideoGenerationRequest = {
  ...defaultVideoSettings,
  prompt: "Waves",
  count: 2,
  seed: 9,
  frames: { start: null, end: null },
};
const video = (index: number, patch: Partial<VideoResult> = {}): VideoResult => ({
  id: `sample-${index}`,
  batchId: "demo-1",
  url: landingAssets.ocean.video!,
  poster: landingAssets.ocean.image,
  alt: "Sample preview",
  prompt: "Waves",
  model: settings.model,
  mode: "text",
  aspectRatio: "16:9",
  resolution: "720p",
  duration: 5,
  motion: "auto",
  audio: false,
  seed: 9,
  createdAt: "2026-11-13T12:00:00.000Z",
  favorite: false,
  demo: true,
  ...patch,
});
const response = (patch: Partial<VideoGenerationResponse> = {}): VideoGenerationResponse => ({
  id: "demo-1",
  demo: true,
  creditsCharged: 0,
  estimatedCredits: 80,
  videos: [video(1), video(2)],
  ...patch,
});
const fetching = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));

describe("video preview transport", () => {
  it("posts settings to the local demo endpoint only", async () => {
    const fetcher = fetching(response());
    const signal = new AbortController().signal;
    await expect(requestVideoPreview(settings, signal, fetcher)).resolves.toEqual(response());
    expect(fetcher).toHaveBeenCalledWith(
      "/api/demo/video-generation",
      expect.objectContaining({ method: "POST", body: JSON.stringify(settings), signal }),
    );
  });

  it("surfaces structured server errors with their fields", async () => {
    const fetcher = fetching(
      { ok: false, error: { message: "Check the video settings.", fields: { duration: "Bad", junk: 4 } } },
      400,
    );
    await expect(requestVideoPreview(settings, new AbortController().signal, fetcher)).rejects.toMatchObject({
      message: "Check the video settings.",
      fields: { duration: "Bad" },
    });
  });

  it.each([
    response({ creditsCharged: 5 as 0 }),
    response({ videos: [video(1)] }),
    response({ videos: [video(1), video(2, { url: "https://example.com/clip.mp4" })] }),
    response({ videos: [video(1), video(2, { batchId: "other" })] }),
    response({ videos: [video(1), video(2, { motion: "teleport" })] }),
  ])("rejects unexpected responses", async (body) => {
    await expect(requestVideoPreview(settings, new AbortController().signal, fetching(body))).rejects.toBeInstanceOf(
      VideoPreviewError,
    );
  });

  it("reports network failures kindly and rethrows aborts", async () => {
    await expect(
      requestVideoPreview(
        settings,
        new AbortController().signal,
        vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")),
      ),
    ).rejects.toThrow("couldn’t reach");
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException("Aborted", "AbortError");
    await expect(
      requestVideoPreview(settings, controller.signal, vi.fn<typeof fetch>().mockRejectedValue(abort)),
    ).rejects.toBe(abort);
  });
});
