import { describe, expect, it } from "vitest";
import { defaultVideoSettings, MAX_FRAME_BYTES, MAX_VIDEO_PROMPT_LENGTH } from "@/components/video-generator/constants";
import { validateVideoGenerationRequest } from "./validation";

const frame = (id: string) => ({ id, mimeType: "image/png", size: 2048 });
function validRequest(patch: Record<string, unknown> = {}) {
  return {
    ...defaultVideoSettings,
    prompt: "Waves rolling onto a sunlit shore",
    frames: { start: null, end: null },
    ...patch,
  };
}
function invalidField(patch: Record<string, unknown>, field: string) {
  const result = validateVideoGenerationRequest(validRequest(patch));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected invalid settings");
  expect(result.error.fields?.[field]).toBeDefined();
}

describe("video demo request validation", () => {
  it("normalizes whitespace and returns a complete settings whitelist", () => {
    const result = validateVideoGenerationRequest(validRequest({ prompt: "  Waves  ", negativePrompt: " blur " }));
    expect(result).toEqual({ ok: true, data: validRequest({ prompt: "Waves", negativePrompt: "blur" }) });
  });

  it.each([null, [], "prompt", 1])("rejects a non-object request: %j", (input) => {
    expect(validateVideoGenerationRequest(input).ok).toBe(false);
  });

  it("accepts image-to-video without a prompt, and start & end frames on capable models", () => {
    expect(
      validateVideoGenerationRequest(
        validRequest({ prompt: "", mode: "image", frames: { start: frame("a"), end: null } }),
      ).ok,
    ).toBe(true);
    expect(
      validateVideoGenerationRequest(validRequest({ mode: "frames", frames: { start: frame("a"), end: frame("b") } }))
        .ok,
    ).toBe(true);
  });

  it.each([
    [{ prompt: " " }, "prompt"],
    [{ prompt: "x".repeat(MAX_VIDEO_PROMPT_LENGTH + 1) }, "prompt"],
    [{ model: "unknown" }, "model"],
    [{ duration: 7 }, "duration"],
    [{ model: "kling_2_1", resolution: "480p" }, "resolution"],
    [{ model: "veo_3_1", aspectRatio: "1:1", duration: 8 }, "aspectRatio"],
    [{ model: "kling_2_1", audio: true }, "audio"],
    [{ count: 5 }, "count"],
    [{ motion: "teleport" }, "motion"],
    [{ motionStrength: 101 }, "motionStrength"],
    [{ seed: -1 }, "seed"],
    [{ url: "https://example.com" }, "request"],
    [{ mode: "image" }, "frames.start"],
    [{ mode: "frames", frames: { start: frame("a"), end: null } }, "frames.end"],
    [{ mode: "frames", frames: { start: frame("a"), end: frame("a") } }, "frames.end"],
    [{ mode: "image", frames: { start: frame("a"), end: frame("b") } }, "frames.end"],
    [{ frames: { start: frame("a"), end: null } }, "frames"],
    [{ model: "veo_3_1", duration: 8, mode: "frames", frames: { start: frame("a"), end: frame("b") } }, "mode"],
    [{ mode: "image", frames: { start: { ...frame("a"), url: "blob:x" }, end: null } }, "frames.start"],
    [
      { mode: "image", frames: { start: { ...frame("a"), size: MAX_FRAME_BYTES + 1 }, end: null } },
      "frames.start.size",
    ],
    [
      { mode: "image", frames: { start: { ...frame("a"), mimeType: "image/gif" }, end: null } },
      "frames.start.mimeType",
    ],
    [{ mode: "image", frames: { start: frame("https://x"), end: null } }, "frames.start.id"],
  ])("rejects %j", (patch, field) => invalidField(patch, field));
});
