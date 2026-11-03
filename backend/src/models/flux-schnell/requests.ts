import { OutputInvalidError, type ModelDefinition } from "../types.js";
import { falResponse } from "./schema.js";

export const ENDPOINT = "fal-ai/flux/schnell";

// One endpoint whether or not there is an image.
const endpointFor = () => ENDPOINT;

export const requestPrediction: ModelDefinition["requestPrediction"] = ({
  fal,
  input,
  webhook,
}) =>
  fal.submit(
    endpointFor(),
    {
      prompt: input.prompt,
      image_size: input.image_size,
      num_images: input.num_images,
      // Always on: the safety checker is never user-controllable.
      enable_safety_checker: true,
    },
    webhook,
  );

export const checkPredictionStatus: ModelDefinition["checkPredictionStatus"] =
  ({ fal, requestId }) => fal.status(endpointFor(), requestId);

export const getPredictionResult: ModelDefinition["getPredictionResult"] = ({
  fal,
  requestId,
}) => fal.result(endpointFor(), requestId);

export const cancelPrediction: ModelDefinition["cancelPrediction"] = ({
  fal,
  requestId,
}) => fal.cancel(endpointFor(), requestId);

export const parseOutput: ModelDefinition["parseOutput"] = (data) => {
  const parsed = falResponse.safeParse(data);
  if (!parsed.success) {
    throw new OutputInvalidError(
      `flux-schnell output invalid: ${parsed.error.message}`,
    );
  }
  const { images, has_nsfw_concepts } = parsed.data;
  const outputs: { url: string; mimeType: string }[] = [];
  let blockedCount = 0;
  images.forEach((img, i) => {
    // fal flags images its safety checker blocked; we drop and count them.
    if (has_nsfw_concepts?.[i] === true) {
      blockedCount += 1;
      return;
    }
    outputs.push({ url: img.url, mimeType: img.content_type ?? "image/jpeg" });
  });
  return { outputs, blockedCount };
};
