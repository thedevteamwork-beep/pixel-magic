import { describe, expect, it } from "vitest";
import { defaultVideoSettings, MAX_CLIP_BYTES, MAX_FRAME_BYTES, MAX_VIDEO_PROMPT_LENGTH } from "@/constants/video-generator";
import { validateVideoGenerationRequest } from "./validation";

const image = (id: string) => ({ id, mimeType: "image/png", size: 2048 });
const clip = (patch: Record<string, unknown> = {}) => ({ id: "clip-1", mimeType: "video/mp4", size: 4096, duration: 6, ...patch });
const none = { start: null, end: null, references: [], clip: null };
function validRequest(patch: Record<string, unknown> = {}) {
  return { ...defaultVideoSettings, prompt: "Waves rolling onto a sunlit shore", inputs: none, ...patch };
}
function invalidField(patch: Record<string, unknown>, field: string) {
  const result = validateVideoGenerationRequest(validRequest(patch));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected invalid settings");
  expect(result.error.fields?.[field]).toBeDefined();
}

describe("video demo request validation", () => {
  it("normalizes whitespace and returns a complete settings whitelist", () => {
    const result = validateVideoGenerationRequest(validRequest({ prompt: "  Waves  " }));
    expect(result).toEqual({ ok: true, data: validRequest({ prompt: "Waves" }) });
  });

  it.each([null, [], "prompt", 1])("rejects a non-object request: %j", (input) => {
    expect(validateVideoGenerationRequest(input).ok).toBe(false);
  });

  it.each([
    ["image to video without a prompt", { prompt: "", mode: "image", inputs: { ...none, start: image("a") } }],
    ["image to video with an end frame", { mode: "image", inputs: { ...none, start: image("a"), end: image("b") } }],
    ["reference to video", { mode: "reference", inputs: { ...none, references: [image("a"), image("b")] } }],
    ["motion control without a prompt", { model: "kling_2_1", prompt: "", mode: "motion", inputs: { ...none, start: image("a"), clip: clip() } }],
  ])("accepts %s", (_name, patch) => {
    expect(validateVideoGenerationRequest(validRequest(patch)).ok).toBe(true);
  });

  it.each([
    [{ prompt: " " }, "prompt"],
    [{ prompt: "x".repeat(MAX_VIDEO_PROMPT_LENGTH + 1) }, "prompt"],
    [{ model: "unknown" }, "model"],
    [{ duration: 31 }, "duration"],
    [{ model: "kling_2_1", resolution: "480p" }, "resolution"],
    [{ model: "veo_3_1", aspectRatio: "1:1", duration: 8 }, "aspectRatio"],
    [{ model: "kling_2_1", audio: true }, "audio"],
    [{ count: 5 }, "count"],
    [{ mode: "frames" }, "mode"],
    [{ mode: "motion" }, "mode"],
    [{ seed: 4 }, "request"],
    [{ inputs: { ...none, start: image("a") } }, "inputs"],
    [{ mode: "image" }, "inputs.start"],
    [{ model: "hailuo_02", mode: "image", duration: 6, inputs: { ...none, start: image("a"), end: image("b") } }, "inputs.end"],
    [{ mode: "image", inputs: { ...none, start: image("a"), end: image("a") } }, "inputs"],
    [{ mode: "reference" }, "inputs.references"],
    [{ mode: "reference", prompt: "", inputs: { ...none, references: [image("a")] } }, "prompt"],
    [{ model: "veo_3_1", duration: 8, mode: "reference", inputs: { ...none, references: ["a", "b", "c", "d"].map(image) } }, "inputs.references"],
    [{ model: "kling_2_1", mode: "motion", inputs: { ...none, start: image("a") } }, "inputs.clip"],
    [{ model: "kling_2_1", mode: "motion", inputs: { ...none, start: image("a"), clip: clip({ duration: 45 }) } }, "inputs.clip.duration"],
    [{ model: "kling_2_1", mode: "motion", inputs: { ...none, start: image("a"), clip: clip({ size: MAX_CLIP_BYTES + 1 }) } }, "inputs.clip.size"],
    [{ model: "kling_2_1", mode: "motion", inputs: { ...none, start: image("a"), clip: clip({ mimeType: "image/gif" }) } }, "inputs.clip.mimeType"],
    [{ mode: "image", inputs: { ...none, start: { ...image("a"), url: "blob:x" } } }, "inputs.start"],
    [{ mode: "image", inputs: { ...none, start: { ...image("a"), size: MAX_FRAME_BYTES + 1 } } }, "inputs.start.size"],
    [{ mode: "image", inputs: { ...none, start: image("https://x") } }, "inputs.start.id"],
  ])("rejects %j", (patch, field) => invalidField(patch, field));
});
