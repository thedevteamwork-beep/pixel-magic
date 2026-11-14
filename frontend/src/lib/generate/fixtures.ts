import type { JobView, PublicModel } from "@/lib/api/types";

// Copies of what `GET /v1/models` returns for the two models, built from the
// backend's model schemas and `publicModel` (credits are the default ranges).

export const kling21: PublicModel = {
  key: "kling21_generate",
  plugin: "kling21",
  operation: "generate",
  name: "Kling 2.1 Master",
  kind: "video",
  category: ["image-to-video", "text-to-video"],
  description:
    "The premium endpoint for Kling 2.1, designed for top-tier image-to-video generation with unparalleled motion fluidity, cinematic visuals, and exceptional prompt precision.",
  credits: { min: 30, max: 60 },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 2500,
    },
    image: {
      type: "image",
      description: "Image to animate. Leave it out to generate from the prompt alone.",
      required: false,
      maxItems: 1,
      supportedContentTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp"],
    },
    duration: {
      type: "string",
      description: "Duration of the generated video in seconds",
      enum: ["5", "10"],
      default: "5",
    },
    aspect_ratio: {
      type: "string",
      description: "Aspect ratio of the generated video (text-to-video only; an image sets its own)",
      enum: ["9:16", "16:9", "1:1"],
      default: "16:9",
    },
  },
};

export const fluxSchnell: PublicModel = {
  key: "fluxSchnell_generate",
  plugin: "fluxSchnell",
  operation: "generate",
  name: "FLUX Schnell",
  kind: "image",
  category: ["text-to-image"],
  description: "FLUX.1 [schnell] turns a text prompt into high-quality images in 1 to 4 steps.",
  credits: { min: 1, max: 4 },
  input: {
    prompt: {
      type: "string",
      description: "Text description of what you want to generate",
      required: true,
      maxLength: 2000,
    },
    image_size: {
      type: "string",
      description: "Size and shape of the generated images",
      enum: ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
      default: "landscape_4_3",
    },
    num_images: {
      type: "integer",
      description: "Number of images to generate",
      minimum: 1,
      maximum: 4,
      default: 1,
    },
  },
};

export function jobView(status: JobView["status"], extra: Partial<JobView> = {}): JobView {
  return {
    jobId: "job-1",
    projectId: null,
    status,
    model: "fluxSchnell_generate",
    creditCost: 2,
    createdAt: "2026-11-07T10:00:00.000Z",
    completedAt: null,
    outputs: [],
    ...extra,
  };
}
