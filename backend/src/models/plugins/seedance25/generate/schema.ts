import type { ModelSchema } from "../../../types.js";
import { endImageField, referenceImagesField } from "../../../videoInputs.js";

// Ported from Pixelbin's seedance25_generate transformation schema.
// end_image is sent as end_image_url; reference_images use fal's reference-to-video (image_urls). Not ported: video_urls, audio_urls.
export const schema: ModelSchema = {
  info: {
    name: "seedance25_generate",
    displayName: "Seedance 2.5",
    kind: "video",
    category: ["image-to-video", "text-to-video"],
    description:
      "Seedance 2.5 generates videos from text, images, or multimodal image and video references with optional native audio.",
    bannerImage:
      "https://cdn.pixelbin.io/v2/dummy-cloudname/original/prediction_api_banner_images/seedance25.png",
    logo: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/__pixelbin_assets/logo/seedance.svg",
  },
  input: {
    prompt: {
      type: "string",
      description: "The text prompt used to generate the video.",
      required: true,
      maxLength: 5000,
    },
    image: {
      type: "image",
      description:
        "Start frame to animate. Leave it out to generate from the prompt alone.",
      required: false,
      maxItems: 1,
      supportedContentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
    },
    end_image: endImageField(),
    reference_images: referenceImagesField(4),
    resolution: {
      type: "string",
      description: "Resolution of the generated video.",
      enum: ["480p", "720p"],
      default: "720p",
    },
    duration: {
      type: "string",
      description: "Duration of the generated video in seconds.",
      enum: [
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "30",
      ],
      default: "5",
    },
    aspect_ratio: {
      type: "string",
      description:
        "Aspect ratio of the generated video. First-frame and first-last-frame generations automatically follow the first image's aspect ratio.",
      enum: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9",
    },
    audio: {
      type: "boolean",
      description: "Whether to generate synchronized audio.",
      default: true,
    },
  },
  output: {
    description: "The generated video",
    mimeTypes: ["video/mp4"],
  },
  billing: { units: ["duration"] },
};
