import type { PublicModel } from "@/lib/api/types";
import type { VideoModel } from "@/types/video-generator";
import { toVideoModel } from "./models";

const image = {
  type: "image" as const,
  description: "Start image",
  required: false,
  maxItems: 1,
  supportedContentTypes: ["image/png"],
};
const prompt = { type: "string" as const, description: "Prompt", required: true, maxLength: 2500 };
const choice = (values: string[], fallback: string) => ({
  type: "string" as const,
  description: "Choice",
  enum: values,
  default: fallback,
});

/** Video models shaped as `GET /v1/models` returns them, for tests. */
export const seedanceSource: PublicModel = {
  key: "seedance25_generate",
  plugin: "seedance25",
  operation: "generate",
  name: "Seedance 2.5",
  kind: "video",
  category: ["text-to-video", "image-to-video"],
  description: "Seedance",
  credits: { min: 56, max: 900 },
  input: {
    prompt,
    image,
    resolution: choice(["720p", "480p"], "720p"),
    duration: choice(
      Array.from({ length: 27 }, (_, index) => String(index + 4)),
      "5",
    ),
    aspect_ratio: choice(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], "16:9"),
    audio: { type: "boolean", description: "Sound", default: false },
  },
};

export const hailuoSource: PublicModel = {
  ...seedanceSource,
  key: "hailuo23_generate",
  plugin: "hailuo23",
  name: "MiniMax Hailuo 2.3",
  input: { prompt, image, resolution: choice(["1080p"], "1080p"), duration: choice(["5"], "5") },
};

export const kling21Source: PublicModel = {
  ...seedanceSource,
  key: "kling21_generate",
  plugin: "kling21",
  name: "Kling 2.1 Master",
  input: { prompt, image, duration: choice(["5", "10"], "5"), aspect_ratio: choice(["9:16", "16:9", "1:1"], "16:9") },
};

export const seedance: VideoModel = toVideoModel(seedanceSource, {
  maker: "ByteDance",
  symbol: "❋",
  tag: "Top",
  speed: 6,
});
export const hailuo: VideoModel = toVideoModel(hailuoSource, { maker: "MiniMax", symbol: "◎" });
export const kling21: VideoModel = toVideoModel(kling21Source, { maker: "Kuaishou", symbol: "◆", speed: 9 });
export const testModels: readonly VideoModel[] = [seedance, hailuo, kling21];
