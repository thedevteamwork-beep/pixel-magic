import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's seedance25 plugin (its fal path; Pixelbin tries BytePlus first and falls back to fal).
const APP = "bytedance/seedance-2.5";

const mode = (input: Record<string, unknown>) =>
  imageUrls(input.reference_images).length
    ? "reference-to-video"
    : input.image
      ? "image-to-video"
      : "text-to-video";

export const seedance25Generate = defineFalModel({
  plugin: "seedance25",
  operation: "generate",
  schema,
  // References make it reference-to-video; a start frame, image-to-video.
  endpoint: (input) => `${APP}/${mode(input)}`,
  app: APP,
  payload: (input) => {
    const references = imageUrls(input.reference_images);
    const base = {
      prompt: input.prompt,
      resolution: input.resolution,
      duration: input.duration,
      generate_audio: input.audio,
    };
    if (references.length)
      return {
        ...base,
        aspect_ratio: input.aspect_ratio,
        image_urls: references,
      };
    if (!input.image) return { ...base, aspect_ratio: input.aspect_ratio };
    // A start frame sets the shape, so fal is told to follow it.
    return {
      ...base,
      aspect_ratio: "auto",
      image_url: input.image,
      ...(input.end_image ? { end_image_url: input.end_image } : {}),
    };
  },
  output: "video",
  // As Pixelbin bills it. There is no reference-video input here, so `video` is always false.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    output_resolution: String(options.resolution ?? "720p"),
    video: false,
    duration: Number(options.duration),
  }),
});
