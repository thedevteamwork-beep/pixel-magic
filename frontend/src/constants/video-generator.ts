import type { MediaId } from "@/types/landing";
import type { VideoInspiration, VideoModeOption, VideoModel, VideoResolution, VideoSettings } from "@/types/video-generator";

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** In the order the mode menu shows them. */
export const videoModes: readonly VideoModeOption[] = [
  { id: "image", name: "Image to Video", description: "Bring a still to life, from a start to an end frame." },
  { id: "text", name: "Text to Video", description: "Describe a scene and watch it unfold." },
  { id: "motion", name: "Motion Control", description: "Copy the movement in a clip onto your character.", isNew: true },
  { id: "reference", name: "Reference to Video", description: "Keep characters, products and style consistent.", isNew: true },
];

/**
 * Preview capabilities, centralized for the later provider integration.
 * Credit rates are indicative only; the preview never charges.
 */
export const videoModels: readonly VideoModel[] = [
  {
    id: "seedance_2_5", name: "Seedance 2.5", maker: "ByteDance", symbol: "❋", tag: "Top",
    description: "Multi-shot storytelling with steady subjects and fluid camera work.",
    modes: ["text", "image", "reference"], durations: range(4, 30), durationMarks: [4, 10, 15, 20, 30],
    resolutions: ["480p", "720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    endFrame: true, maxReferences: 9, audio: true, creditsPerSecond: { "480p": 4, "720p": 8, "1080p": 16 }, speed: 6,
  },
  {
    id: "seedance_2_5_flash", name: "Seedance 2.5 Flash", maker: "ByteDance", symbol: "❋", tag: "New",
    description: "Quick, affordable drafts to explore an idea before the final render.",
    modes: ["text", "image", "reference"], durations: range(4, 30), durationMarks: [4, 10, 15, 20, 30],
    resolutions: ["480p", "720p"], aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    endFrame: true, maxReferences: 4, audio: true, creditsPerSecond: { "480p": 2, "720p": 4, "1080p": 8 }, speed: 3,
  },
  {
    id: "kling_2_1", name: "Kling 2.1", maker: "Kuaishou", symbol: "◆",
    description: "Expressive human motion, physically grounded action and motion transfer.",
    modes: ["text", "image", "motion", "reference"], durations: [5, 10],
    resolutions: ["720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1"],
    endFrame: true, maxReferences: 4, audio: false, creditsPerSecond: { "480p": 6, "720p": 10, "1080p": 20 }, speed: 9,
  },
  {
    id: "veo_3_1", name: "Veo 3.1", maker: "Google", symbol: "✦", tag: "Audio",
    description: "Cinematic realism with native dialogue, ambience and sound effects.",
    modes: ["text", "image", "reference"], durations: [4, 6, 8],
    resolutions: ["720p", "1080p"], aspectRatios: ["16:9", "9:16"],
    endFrame: true, maxReferences: 3, audio: true, creditsPerSecond: { "480p": 20, "720p": 25, "1080p": 40 }, speed: 8,
  },
  {
    id: "veo_3_1_fast", name: "Veo 3.1 Fast", maker: "Google", symbol: "✦", tag: "Fast",
    description: "Veo’s look and sound at a lower cost, for quick iterations.",
    modes: ["text", "image"], durations: [4, 6, 8],
    resolutions: ["720p", "1080p"], aspectRatios: ["16:9", "9:16"],
    endFrame: false, maxReferences: 0, audio: true, creditsPerSecond: { "480p": 10, "720p": 12, "1080p": 20 }, speed: 4,
  },
  {
    id: "hailuo_02", name: "Hailuo 02", maker: "MiniMax", symbol: "◎",
    description: "Dynamic physics, fast action and dramatic camera moves.",
    modes: ["text", "image"], durations: [6, 10],
    resolutions: ["480p", "720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1"],
    endFrame: false, maxReferences: 0, audio: false, creditsPerSecond: { "480p": 3, "720p": 6, "1080p": 12 }, speed: 5,
  },
  {
    id: "wan_2_5", name: "Wan 2.5", maker: "Alibaba", symbol: "≋",
    description: "Open, versatile and quick, with character animation from a clip.",
    modes: ["text", "image", "motion"], durations: [5, 10],
    resolutions: ["480p", "720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    endFrame: true, maxReferences: 0, audio: true, creditsPerSecond: { "480p": 2, "720p": 4, "1080p": 8 }, speed: 3,
  },
];

export const allVideoResolutions: readonly VideoResolution[] = ["480p", "720p", "1080p"];
export const videoCounts = [1, 2, 3, 4] as const;
export const MAX_VIDEO_PROMPT_LENGTH = 2500;
export const MAX_FRAME_BYTES = 20 * 1024 * 1024;
export const FRAME_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_CLIP_BYTES = 100 * 1024 * 1024;
export const CLIP_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MIN_CLIP_SECONDS = 2;
export const MAX_CLIP_SECONDS = 30;
export const MAX_REFERENCE_LIMIT = Math.max(...videoModels.map((model) => model.maxReferences));

export const defaultVideoSettings: Readonly<VideoSettings> = {
  model: "seedance_2_5", prompt: "", mode: "text", aspectRatio: "16:9", resolution: "720p", duration: 5, count: 1,
  audio: false, enhancePrompt: true,
};

export const videoInspirations: readonly VideoInspiration[] = [
  { id: "desert-drive", title: "Somewhere in between", category: "Cinematic", asset: "desert", aspectRatio: "21:9", duration: 10, prompt: "A vintage car crossing terracotta-orange desert dunes at golden hour, a long trail of dust catching the low sun, violet mountains on the horizon. A slow crane shot rises above the scene, cinematic and quiet." },
  { id: "ocean-aerial", title: "A little out of office", category: "Travel", asset: "ocean", aspectRatio: "16:9", duration: 5, prompt: "A fast, low FPV drone flight over turquoise waves rolling onto a sunlit shoreline, white foam patterns, crystal-clear water, bright natural light." },
  { id: "neon-portrait", title: "After the last light", category: "Portrait", asset: "portrait", aspectRatio: "9:16", duration: 5, prompt: "An adult woman with curly dark hair slowly turns toward the camera and smiles as the camera gently pushes in, magenta and cyan neon light washing across her face, deep purple background." },
  { id: "perfume-turn", title: "Objects of affection", category: "Product", asset: "product", aspectRatio: "1:1", duration: 5, prompt: "The camera orbits a sculptural glass perfume bottle with amber fragrance on a travertine pedestal, soft olive-leaf shadows drifting across a beige plaster wall, light catching the glass." },
  { id: "tide-loop", title: "The slow hours", category: "Ambient", asset: "ocean", aspectRatio: "9:16", duration: 10, prompt: "Gentle waves washing over smooth sand in a seamless, calm loop from a locked-off camera, soft afternoon light, peaceful and meditative." },
  { id: "dune-reveal", title: "Edge of the map", category: "Landscape", asset: "desert", aspectRatio: "16:9", duration: 10, prompt: "A lone figure standing on a dune ridge at sunset; the camera pulls back to reveal an endless sea of sand under a peach sky." },
];

/** Sample clips available to the preview; keyed by media id so posters stay in sync. */
export const videoSampleAssets: readonly MediaId[] = ["desert", "ocean", "portrait", "product"];

/** Stage labels shown during a render, by fraction of progress reached. */
export const renderStages: readonly { at: number; label: string }[] = [
  { at: 0, label: "In queue" },
  { at: 0.08, label: "Reading your direction" },
  { at: 0.3, label: "Composing keyframes" },
  { at: 0.62, label: "Rendering motion" },
  { at: 0.88, label: "Final polish" },
];
