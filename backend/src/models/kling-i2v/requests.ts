import { OutputInvalidError, type ModelDefinition } from "../types.js";
import { falOutputSchema, type KlingOptions } from "./schema.js";

export const buildInput: ModelDefinition["buildInput"] = (p) => ({
  prompt: p.prompt,
  image_url: p.inputUrls[0],
  duration: (p.options as KlingOptions).duration,
});

export const parseOutput: ModelDefinition["parseOutput"] = (data) => {
  const parsed = falOutputSchema.safeParse(data);
  if (!parsed.success) {
    throw new OutputInvalidError(
      `kling-i2v output invalid: ${parsed.error.message}`,
    );
  }
  const { video } = parsed.data;
  return {
    outputs: [{ url: video.url, mimeType: video.content_type ?? "video/mp4" }],
    blockedCount: 0,
  };
};
