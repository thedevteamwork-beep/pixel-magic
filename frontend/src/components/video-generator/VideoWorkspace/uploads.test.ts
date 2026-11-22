import { describe, expect, it } from "vitest";
import { kling3MC, seedance } from "@/lib/video-generator/testModels";
import type { FrameImage, MotionClip, VideoInputs } from "@/types/video-generator";
import { inputsKey, markUploaded, uploadsKey } from "./uploads";

const frame = (id: string, uploadId?: string): FrameImage => ({
  id,
  url: `blob:${id}`,
  name: id,
  mimeType: "image/png",
  size: 1,
  source: "upload",
  width: 10,
  height: 10,
  ...(uploadId ? { uploadId } : {}),
});
const clip: MotionClip = {
  id: "clip",
  url: "blob:clip",
  name: "c",
  mimeType: "video/mp4",
  size: 1,
  duration: 5,
  width: 1,
  height: 1,
};

describe("render uploads", () => {
  const inputs: VideoInputs = { start: frame("s"), end: frame("e"), references: [frame("a")], clip };

  it("keys a render's files the same way before and after they are uploaded", () => {
    const before = inputsKey(seedance, "image", inputs);
    const sent = uploadsKey({ image: [{ key: "s" }], end_image: [{ key: "e" }] });
    expect(before).toBe(sent);
    const marked = markUploaded(inputs, { s: "up-s", e: "up-e" });
    expect(inputsKey(seedance, "image", marked)).toBe(
      uploadsKey({ image: [{ key: "s", uploadId: "up-s" }], end_image: [{ key: "e", uploadId: "up-e" }] }),
    );
  });

  it("notes upload ids on the attachments that got them, and nothing else", () => {
    const marked = markUploaded(inputs, { clip: "up-c" });
    expect(marked.clip?.uploadId).toBe("up-c");
    expect(marked.start).toBe(inputs.start);
    expect(markUploaded(inputs, {})).toBe(inputs);
  });

  it("tells a different start image or clip apart", () => {
    const other = { ...inputs, clip: { ...clip, id: "clip-2" } };
    expect(inputsKey(kling3MC, "motion", inputs)).not.toBe(inputsKey(kling3MC, "motion", other));
  });
});
