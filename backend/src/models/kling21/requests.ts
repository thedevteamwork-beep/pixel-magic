import { OutputInvalidError, type ModelDefinition } from "../types.js";
import { falResponse } from "./schema.js";

export const BASE_ENDPOINT = "fal-ai/kling-video/v2.1/master";
export const IMAGE_TO_VIDEO_ENDPOINT = `${BASE_ENDPOINT}/image-to-video`;
export const TEXT_TO_VIDEO_ENDPOINT = `${BASE_ENDPOINT}/text-to-video`;

const endpointFor = (hasImage: boolean) =>
  hasImage ? IMAGE_TO_VIDEO_ENDPOINT : TEXT_TO_VIDEO_ENDPOINT;

export const requestPrediction: ModelDefinition["requestPrediction"] = ({
  fal,
  input,
  webhook,
}) => {
  // Step 1: an image makes it image-to-video; otherwise text-to-video.
  const endpoint = endpointFor(Boolean(input.image));

  // Step 2: the fields every request has.
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    duration: input.duration,
  };

  // Step 3: only include image_url if image is provided (the image sets the
  // shape); text-to-video needs an aspect ratio instead.
  if (input.image) {
    payload.image_url = input.image;
  } else {
    payload.aspect_ratio = input.aspect_ratio;
  }

  // Step 4: one attempt; the shared client classifies errors.
  return fal.submit(endpoint, payload, webhook);
};

export const checkPredictionStatus: ModelDefinition["checkPredictionStatus"] =
  ({ fal, requestId, hasImage }) =>
    fal.status(endpointFor(hasImage), requestId);

export const getPredictionResult: ModelDefinition["getPredictionResult"] = ({
  fal,
  requestId,
  hasImage,
}) => fal.result(endpointFor(hasImage), requestId);

export const cancelPrediction: ModelDefinition["cancelPrediction"] = ({
  fal,
  requestId,
  hasImage,
}) => fal.cancel(endpointFor(hasImage), requestId);

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
