import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's qwen3 plugin.
const APP = "alibaba/qwen-image-3";

// The resolution sets the long side; the aspect ratio sets the short one.
const OUTPUT_RESOLUTION_LONG_SIDE: Record<string, number> = {
  "1k": 1024,
  "2k": 2048,
};
// At 1K, fal's named presets cover the common ratios.
const ONE_K_IMAGE_SIZE_PRESETS: Record<string, string> = {
  "1:1": "square_hd",
  "4:3": "landscape_4_3",
  "3:4": "portrait_4_3",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
};
const DIMENSION_MULTIPLE = 32;

const roundToDimensionMultiple = (dimension: number) =>
  Math.max(
    DIMENSION_MULTIPLE,
    Math.round(dimension / DIMENSION_MULTIPLE) * DIMENSION_MULTIPLE,
  );

/** A fal preset at 1K when one fits the ratio, else the width and height, the short side a multiple of 32. */
export function qwen3ImageSize(
  aspectRatio: string,
  outputResolution: string,
): string | { width: number; height: number } {
  const preset = ONE_K_IMAGE_SIZE_PRESETS[aspectRatio];
  if (outputResolution === "1k" && preset) return preset;
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w! / h!;
  const longSide =
    OUTPUT_RESOLUTION_LONG_SIDE[outputResolution] ??
    OUTPUT_RESOLUTION_LONG_SIDE["1k"]!;
  return ratio >= 1
    ? { width: longSide, height: roundToDimensionMultiple(longSide / ratio) }
    : { width: roundToDimensionMultiple(longSide * ratio), height: longSide };
}

export const qwen3Generate = defineFalModel({
  plugin: "qwen3",
  operation: "generate",
  schema,
  // References make it an edit.
  endpoint: (input) =>
    `${APP}/${imageUrls(input.images).length ? "edit" : "text-to-image"}`,
  app: APP,
  payload: (input) => {
    const images = imageUrls(input.images);
    return {
      prompt: input.prompt,
      num_images: input.num_images,
      image_size: qwen3ImageSize(
        input.aspect_ratio as string,
        input.output_resolution as string,
      ),
      output_format: "png",
      sync_mode: false,
      ...(images.length ? { image_urls: images } : {}),
    };
  },
  output: "images",
  // The mapping prices one image; each extra image costs the same again.
  pricePerImage: { countField: "num_images" },
  // Priced on output_resolution ("1k" / "2k"), an option; the default facts include it.
});
