import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's veo31Fast plugin (its fal path; Pixelbin tries Vertex AI first and falls back to fal).
const BASE = "fal-ai/veo3.1/fast";

export const veo31FastGenerate = defineFalModel({
  plugin: "veo31Fast",
  operation: "generate",
  schema,
  // A start and an end frame use first-last-frame-to-video; a start frame alone, image-to-video.
  endpoint: (input) =>
    input.image && input.end_image
      ? `${BASE}/first-last-frame-to-video`
      : input.image
        ? `${BASE}/image-to-video`
        : BASE,
  app: "fal-ai/veo3.1",
  payload: (input) => ({
    prompt: input.prompt,
    // fal takes "4s"/"6s"/"8s"; Pixelbin's fallback sent the bare number, which fal rejects.
    duration: `${String(input.duration)}s`,
    aspect_ratio: input.aspect_ratio,
    resolution: input.resolution,
    generate_audio: input.audio,
    ...(input.image && input.end_image
      ? { first_frame_url: input.image, last_frame_url: input.end_image }
      : input.image
        ? { image_url: input.image }
        : {}),
  }),
  output: "video",
  // As Pixelbin bills it: audio, the resolution and the length in seconds.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    audio: Boolean(options.audio),
    output_resolution: String(options.resolution),
    duration: Number(options.duration),
  }),
});
