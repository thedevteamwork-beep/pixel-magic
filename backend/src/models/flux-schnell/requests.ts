import { OutputInvalidError, type ModelDefinition } from "../types.js";
import { falOutputSchema, type FluxOptions } from "./schema.js";

export const buildInput: ModelDefinition["buildInput"] = (p) => {
  const o = p.options as FluxOptions;
  return {
    prompt: p.prompt,
    image_size: o.image_size,
    num_images: o.num_images,
    enable_safety_checker: true,
  };
};

export const parseOutput: ModelDefinition["parseOutput"] = (data) => {
  const parsed = falOutputSchema.safeParse(data);
  if (!parsed.success) {
    throw new OutputInvalidError(
      `flux-schnell output invalid: ${parsed.error.message}`,
    );
  }
  const { images, has_nsfw_concepts } = parsed.data;
  const outputs: { url: string; mimeType: string }[] = [];
  let blockedCount = 0;
  images.forEach((img, i) => {
    if (has_nsfw_concepts?.[i] === true) {
      blockedCount += 1;
      return;
    }
    outputs.push({ url: img.url, mimeType: img.content_type ?? "image/jpeg" });
  });
  return { outputs, blockedCount };
};
