import type { MediaId } from "@/types/landing";
import type { VideoInspiration, VideoModelPresentation, VideoModeOption, VideoSettings } from "@/types/video-generator";

/**
 * The modes the studio offers, in menu order. Reference to Video and Motion
 * Control need inputs the backend doesn't take yet (several images, a clip);
 * add them back here, and to `toVideoModel`, once it does.
 */
export const videoModes: readonly VideoModeOption[] = [
  { id: "image", name: "Image to Video", description: "Bring a still to life from a start image." },
  { id: "text", name: "Text to Video", description: "Describe a scene and watch it unfold." },
];

/** Display details for the backend's video models, keyed by model key. */
export const videoModelPresentation: Record<string, VideoModelPresentation> = {
  seedance25_generate: {
    maker: "ByteDance",
    symbol: "❋",
    tag: "Top",
    description: "Multi-shot storytelling with steady subjects and fluid camera work.",
    speed: 6,
  },
  seedance2_generate: {
    maker: "ByteDance",
    symbol: "❋",
    description: "Sharp detail up to 4K, with native sound.",
    speed: 7,
  },
  klingv3_generate: {
    maker: "Kuaishou",
    symbol: "◆",
    tag: "New",
    description: "Expressive motion and multi-shot scenes, up to 4K, with sound.",
    speed: 9,
  },
  kling25_generate: {
    maker: "Kuaishou",
    symbol: "◆",
    tag: "Fast",
    description: "Fluid, physically grounded motion, fast.",
    speed: 5,
  },
  kling21_generate: { maker: "Kuaishou", symbol: "◆", description: "Kling's cinematic Master model.", speed: 9 },
  veo31Fast_generate: {
    maker: "Google",
    symbol: "✦",
    tag: "Audio",
    description: "Veo's cinematic look with native dialogue and sound, at a lower cost.",
    speed: 4,
  },
  sora2_generate: { maker: "OpenAI", symbol: "◯", description: "Realistic scenes with synced sound.", speed: 8 },
  hailuo23_generate: {
    maker: "MiniMax",
    symbol: "◎",
    description: "Dynamic physics, fast action and dramatic camera moves.",
    speed: 6,
  },
  wan26_generate: { maker: "Alibaba", symbol: "≋", description: "Versatile and quick, up to 15 seconds.", speed: 4 },
  wan25_generate: { maker: "Alibaba", symbol: "≋", description: "Open, versatile and quick.", speed: 3 },
  ltx2Fast_generate: { maker: "Lightricks", symbol: "▲", description: "Long, sharp clips up to 4K, fast.", speed: 3 },
  pixverse6_generate: {
    maker: "PixVerse",
    symbol: "✺",
    description: "Stylised looks: anime, 3D, clay, comic.",
    speed: 3,
  },
};

/** The model the studio opens on when the link doesn't name one. */
export const DEFAULT_VIDEO_MODEL = "seedance25_generate";

export const videoCounts = [1, 2, 3, 4] as const;
export const MAX_ACTIVE_RENDERS = 3;
export const MAX_VIDEO_PROMPT_LENGTH = 2500;
export const MAX_FRAME_BYTES = 20 * 1024 * 1024;
export const FRAME_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_CLIP_BYTES = 100 * 1024 * 1024;
export const CLIP_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MIN_CLIP_SECONDS = 2;
export const MAX_CLIP_SECONDS = 30;

export const defaultVideoSettings: Readonly<VideoSettings> = {
  model: DEFAULT_VIDEO_MODEL,
  prompt: "",
  mode: "text",
  aspectRatio: "16:9",
  resolution: "720p",
  duration: 5,
  count: 1,
  audio: false,
  enhancePrompt: true,
};

export const videoInspirations: readonly VideoInspiration[] = [
  {
    id: "desert-drive",
    title: "Somewhere in between",
    category: "Cinematic",
    asset: "desert",
    aspectRatio: "21:9",
    duration: 10,
    prompt:
      "A vintage car crossing terracotta-orange desert dunes at golden hour, a long trail of dust catching the low sun, violet mountains on the horizon. A slow crane shot rises above the scene, cinematic and quiet.",
  },
  {
    id: "ocean-aerial",
    title: "A little out of office",
    category: "Travel",
    asset: "ocean",
    aspectRatio: "16:9",
    duration: 5,
    prompt:
      "A fast, low FPV drone flight over turquoise waves rolling onto a sunlit shoreline, white foam patterns, crystal-clear water, bright natural light.",
  },
  {
    id: "neon-portrait",
    title: "After the last light",
    category: "Portrait",
    asset: "portrait",
    aspectRatio: "9:16",
    duration: 5,
    prompt:
      "An adult woman with curly dark hair slowly turns toward the camera and smiles as the camera gently pushes in, magenta and cyan neon light washing across her face, deep purple background.",
  },
  {
    id: "perfume-turn",
    title: "Objects of affection",
    category: "Product",
    asset: "product",
    aspectRatio: "1:1",
    duration: 5,
    prompt:
      "The camera orbits a sculptural glass perfume bottle with amber fragrance on a travertine pedestal, soft olive-leaf shadows drifting across a beige plaster wall, light catching the glass.",
  },
  {
    id: "tide-loop",
    title: "The slow hours",
    category: "Ambient",
    asset: "ocean",
    aspectRatio: "9:16",
    duration: 10,
    prompt:
      "Gentle waves washing over smooth sand in a seamless, calm loop from a locked-off camera, soft afternoon light, peaceful and meditative.",
  },
  {
    id: "dune-reveal",
    title: "Edge of the map",
    category: "Landscape",
    asset: "desert",
    aspectRatio: "16:9",
    duration: 10,
    prompt:
      "A lone figure standing on a dune ridge at sunset; the camera pulls back to reveal an endless sea of sand under a peach sky.",
  },
];

/** Sample clips available to the preview; keyed by media id so posters stay in sync. */
export const videoSampleAssets: readonly MediaId[] = ["desert", "ocean", "portrait", "product"];

export const VIDEO_POLL_INTERVAL_MS = 5_000;
/** Past this the studio stops waiting on a render; it still finishes and appears in the feed later. */
export const VIDEO_WAIT_LIMIT_MS = 30 * 60_000;
export const VIDEO_HISTORY_PAGE_SIZE = 30;
/** How long sample mode (`/video?sample=1`, development only) pretends a render takes. */
export const SAMPLE_RENDER_MS = 4_000;

/** Stage labels shown during a render, by fraction of progress reached. */
export const renderStages: readonly { at: number; label: string }[] = [
  { at: 0, label: "In queue" },
  { at: 0.08, label: "Reading your direction" },
  { at: 0.3, label: "Composing keyframes" },
  { at: 0.62, label: "Rendering motion" },
  { at: 0.88, label: "Final polish" },
];
