import type { UploadFieldSchema } from "./types.js";

/**
 * The upload fields video models share, so every model names and describes
 * them the same way and the studio can tell what a model takes by name:
 *   image             the start frame (each model's own field)
 *   end_image         the frame to land on (needs a start frame)
 *   reference_images  people, products or styles to keep (Reference to Video)
 *   video             a clip whose movement is copied (Motion Control)
 */
export const VIDEO_UPLOAD_FIELDS = {
  end: "end_image",
  references: "reference_images",
  clip: "video",
} as const;

export const FRAME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/** MP4 and QuickTime only: their length can be read from the file, and motion control is priced on it. */
export const CLIP_TYPES = ["video/mp4", "video/quicktime"] as const;

export function endImageField(): UploadFieldSchema {
  return {
    type: "image",
    description: "The frame the video ends on. Needs a start frame.",
    required: false,
    maxItems: 1,
    supportedContentTypes: [...FRAME_TYPES],
  };
}

export function referenceImagesField(
  maxItems: number,
  required = false,
): UploadFieldSchema {
  return {
    type: "image",
    description:
      "People, products or styles to keep in the video. Refer to them in the prompt as @Image1, @Image2…",
    required,
    maxItems,
    supportedContentTypes: [...FRAME_TYPES],
  };
}

export function motionClipField(): UploadFieldSchema {
  return {
    type: "video",
    description:
      "A clip whose movement the character copies: up to 30 seconds, MP4 or MOV.",
    required: true,
    maxItems: 1,
    supportedContentTypes: [...CLIP_TYPES],
  };
}
