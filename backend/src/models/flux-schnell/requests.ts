import { OutputInvalidError, type ModelDefinition } from "../types.js";
import { falResponse } from "./schema.js";

export const ENDPOINT = "fal-ai/flux/schnell";

type FluxOptions = { image_size: string; num_images: number };

export const falEndpoint: ModelDefinition["falEndpoint"] = () => ENDPOINT;

export const buildInput: ModelDefinition["buildInput"] = (p) => {
  const options = p.options as FluxOptions;
  return {
    prompt: p.prompt,
    image_size: options.image_size,
    num_images: options.num_images,
    // Always on: the safety checker is never user-controllable.
    enable_safety_checker: true,
  };
};

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
