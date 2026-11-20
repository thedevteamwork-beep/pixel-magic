import { z } from "zod";
import {
  inputValidator,
  optionsValidator,
  uploadRule,
} from "./schemaGenerator.js";
import type { ImageSize } from "../lib/imageSize.js";
import {
  OutputInvalidError,
  type BillingFacts,
  type ModelDefinition,
  type ModelSchema,
  type ParsedOutput,
  type PredictionInput,
} from "./types.js";

/**
 * Where a job is submitted. A function picks the endpoint from the input
 * (an image → edit or image-to-video, a resolution → a faster or better tier).
 */
export type FalEndpoint = string | ((input: PredictionInput) => string);

export type FalModelConfig = {
  /** The plugin and operation in `POST /v1/jobs/:plugin/:operation`. */
  plugin: string;
  operation: string;
  schema: ModelSchema;
  endpoint: FalEndpoint;
  /**
   * The fal app (`owner/name`, e.g. "fal-ai/kling-video"). fal tracks a
   * request by its app, ignoring the endpoint's sub-path, so status, result
   * and cancel only need this. Defaults to the endpoint when that is a string.
   */
  app?: string;
  /**
   * The fal request body, from the job's validated input. The image field
   * holds a signed URL (one image) or a list of them (several), never ids.
   */
  payload: (input: PredictionInput) => Record<string, unknown>;
  /** How fal returns the result: a list of images, one image, or a video. */
  output: "images" | "image" | "video";
  /**
   * The facts the credit mapping prices on. Defaults to the options plus
   * `image` (whether there are uploads). Add `images` or `duration` for the
   * metered units, and rename facts the mapping names differently.
   */
  billing?: (p: {
    options: Record<string, unknown>;
    uploadCount: number;
    /** The input image's size, for a model with `pricedByImageSize`. */
    imageSize?: ImageSize;
  }) => BillingFacts;
  /** Priced by the input image's size (see ModelDefinition). */
  pricedByImageSize?: boolean;
  /**
   * The mapping prices one image and a job asking for several pays for each:
   * the option holding the count (e.g. "num_images"). Its value must be in the
   * billing facts, which the default billing (the options) includes.
   */
  pricePerImage?: { countField: string };
  /** Past this, a job fails even if fal is still working. */
  timeoutMinutes?: number;
};

// What fal returns. Extra fields (seeds, timings, descriptions) are ignored.
const falFile = z.object({
  url: z.string().url(),
  content_type: z.string().optional(),
});
const falImages = z.object({
  images: z.array(falFile),
  has_nsfw_concepts: z.array(z.boolean()).optional(),
});
const falVideo = z.object({ video: falFile });
const falImage = z.object({ image: falFile });

function parseImages(key: string, data: unknown): ParsedOutput {
  const parsed = falImages.safeParse(data);
  if (!parsed.success)
    throw new OutputInvalidError(
      `${key} output invalid: ${parsed.error.message}`,
    );
  const { images, has_nsfw_concepts } = parsed.data;
  // fal flags images its safety checker blocked; they are dropped and counted.
  const blocked = (index: number) => has_nsfw_concepts?.[index] === true;
  return {
    outputs: images
      .filter((_, index) => !blocked(index))
      .map((image) => ({
        url: image.url,
        mimeType: image.content_type ?? "image/png",
      })),
    blockedCount: images.filter((_, index) => blocked(index)).length,
  };
}

function parseVideo(key: string, data: unknown): ParsedOutput {
  const parsed = falVideo.safeParse(data);
  if (!parsed.success)
    throw new OutputInvalidError(
      `${key} output invalid: ${parsed.error.message}`,
    );
  const { video } = parsed.data;
  return {
    outputs: [{ url: video.url, mimeType: video.content_type ?? "video/mp4" }],
    blockedCount: 0,
  };
}

function parseImage(key: string, data: unknown): ParsedOutput {
  const parsed = falImage.safeParse(data);
  if (!parsed.success)
    throw new OutputInvalidError(
      `${key} output invalid: ${parsed.error.message}`,
    );
  const { image } = parsed.data;
  return {
    outputs: [{ url: image.url, mimeType: image.content_type ?? "image/png" }],
    blockedCount: 0,
  };
}

const PARSERS = { images: parseImages, image: parseImage, video: parseVideo };

const DEFAULT_TIMEOUT_MINUTES = { images: 10, image: 10, video: 60 } as const;

/** A model that runs on fal's queue: everything but its schema, payload and pricing is shared. */
export function defineFalModel(config: FalModelConfig): ModelDefinition {
  const { schema, endpoint } = config;
  const app =
    config.app ?? (typeof endpoint === "string" ? endpoint : undefined);
  if (!app)
    throw new Error(
      `${schema.info.name}: a model with an endpoint function needs its fal app`,
    );
  const submitTo = (input: PredictionInput) =>
    typeof endpoint === "string" ? endpoint : endpoint(input);
  const uploads = uploadRule(schema);
  const billing =
    config.billing ??
    (({ options, uploadCount }) => ({ ...options, image: uploadCount > 0 }));

  return {
    plugin: config.plugin,
    operation: config.operation,
    key: schema.info.name,
    kind: schema.info.kind,
    displayName: schema.info.displayName,
    schema,
    input: inputValidator(schema),
    uploads,
    options: optionsValidator(schema),
    billingInputs: ({ options, uploadCount, imageSize }) =>
      billing({
        options: options as Record<string, unknown>,
        uploadCount,
        imageSize,
      }),
    pricedByImageSize: config.pricedByImageSize ?? false,
    priceMultiplier: (facts) => {
      if (!config.pricePerImage) return 1;
      const count = Number(facts[config.pricePerImage.countField]);
      return Number.isInteger(count) && count > 0 ? count : 1;
    },
    requestPrediction: ({ fal, input, webhook }) =>
      fal.submit(submitTo(input), config.payload(input), webhook),
    checkPredictionStatus: ({ fal, requestId }) => fal.status(app, requestId),
    getPredictionResult: ({ fal, requestId }) => fal.result(app, requestId),
    cancelPrediction: ({ fal, requestId }) => fal.cancel(app, requestId),
    parseOutput: (data) => PARSERS[config.output](schema.info.name, data),
    timeoutMinutes:
      config.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES[config.output],
  };
}

/** The image field's signed URLs as a list, whether the model takes one image or several. */
export function imageUrls(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((url): url is string => typeof url === "string");
  return typeof value === "string" ? [value] : [];
}
