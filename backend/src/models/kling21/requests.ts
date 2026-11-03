import { OutputInvalidError, type ModelDefinition } from "../types.js";
import { falResponse } from "./schema.js";

export const BASE_ENDPOINT = "fal-ai/kling-video/v2.1/master";
export const IMAGE_TO_VIDEO_ENDPOINT = `${BASE_ENDPOINT}/image-to-video`;
export const TEXT_TO_VIDEO_ENDPOINT = `${BASE_ENDPOINT}/text-to-video`;

type Kling21Options = { duration: string; aspect_ratio: string };

export const falEndpoint: ModelDefinition["falEndpoint"] = ({ uploadCount }) =>
  uploadCount > 0 ? IMAGE_TO_VIDEO_ENDPOINT : TEXT_TO_VIDEO_ENDPOINT;

export const buildInput: ModelDefinition["buildInput"] = (p) => {
  const options = p.options as Kling21Options;

  // Step 1: the fields every request has.
  const input: Record<string, unknown> = {
    prompt: p.prompt,
    duration: options.duration,
  };

  // Step 2: an image makes it image-to-video (the image sets the shape);
  // without one, text-to-video needs an aspect ratio.
  const [imageUrl] = p.inputUrls;
  if (imageUrl) {
    input.image_url = imageUrl;
  } else {
    input.aspect_ratio = options.aspect_ratio;
  }
  return input;
};

export const parseOutput: ModelDefinition["parseOutput"] = (data) => {
  const parsed = falResponse.safeParse(data);
  if (!parsed.success) {
    throw new OutputInvalidError(
      `kling21 output invalid: ${parsed.error.message}`,
    );
  }
  const { video } = parsed.data;
  return {
    outputs: [{ url: video.url, mimeType: video.content_type ?? "video/mp4" }],
    blockedCount: 0,
  };
};
