import type { MediaId } from "@/types/landing";
import type { VideoInspiration, VideoModelPresentation, VideoModeOption, VideoSettings } from "@/types/video-generator";

/** The modes the studio offers, in menu order. A model offers the ones its upload fields allow (see `toVideoModel`). */
export const videoModes: readonly VideoModeOption[] = [
  { id: "image", name: "Image to Video", description: "Bring a still to life, from a start to an end frame." },
  { id: "text", name: "Text to Video", description: "Describe a scene and watch it unfold." },
  {
    id: "motion",
    name: "Motion Control",
    description: "Copy the movement in a clip onto your character.",
    isNew: true,
  },
  {
    id: "reference",
    name: "Reference to Video",
    description: "Keep characters, products and style consistent.",
    isNew: true,
  },
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
  klingO3Ref_generate: {
    maker: "Kuaishou",
    symbol: "◆",
    tag: "New",
    description: "Keeps people, products and styles from up to four images consistent in a new scene.",
    speed: 9,
  },
  kling3MC_generate: {
    maker: "Kuaishou",
    symbol: "◆",
    tag: "New",
    description: "Moves your character exactly like the person in a reference clip.",
    speed: 8,
  },
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
/** MP4 and MOV: the server reads a clip's length from them, and motion control is priced on it. */
export const CLIP_MIME_TYPES = ["video/mp4", "video/quicktime"] as const;
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
    id: "firefly-promise",
    title: "Firefly promise",
    category: "Fantasy",
    asset: "fairyWorldFilm",
    aspectRatio: "9:16",
    duration: 10,
    prompt:
      "A little girl and a red fox sit together on a mossy ledge in an enchanted forest at night. Fireflies drift up around them, glowing mushrooms light the roots, and the camera slowly pushes in. Warm, magical light.",
  },
  {
    id: "titan-rises",
    title: "The titan rises",
    category: "Sci-fi",
    asset: "mechaWarFilm",
    aspectRatio: "9:16",
    duration: 10,
    prompt:
      "A towering battle mech rises from a smoking crater on a violet alien battlefield. Its reactor vents glow orange and its arm cannons unfold as a swarm of creatures charges through green mist. Epic low-angle shot.",
  },
  {
    id: "derby-winner",
    title: "Derby winner",
    category: "Sport",
    asset: "manchesterDerbyFilm",
    aspectRatio: "16:9",
    duration: 5,
    prompt:
      "A striker volleys the winning goal in a packed night stadium. Floodlights flare, the crowd erupts, and a slow-motion tracking shot follows the ball into the net.",
  },
  {
    id: "rainy-city-vlog",
    title: "Rainy city vlog",
    category: "Vlog",
    asset: "cityVlogFilm",
    aspectRatio: "16:9",
    duration: 5,
    prompt:
      "A young woman walks down a rain-soaked city street while texting, reflections shimmering on the wet pavement. Handheld, vlog-style tracking shot with soft overcast light.",
  },
  {
    id: "glow-mask",
    title: "Glow mask",
    category: "Product",
    asset: "maskTiktokFilm",
    aspectRatio: "9:16",
    duration: 5,
    prompt:
      "In a bright vanity bathroom, a woman holds up a glowing red LED face mask and smiles at the camera. Soft beauty lighting, social-media style close-up.",
  },
  {
    id: "candlelight",
    title: "By candlelight",
    category: "Cinematic",
    asset: "aureliaEscapeFilm",
    aspectRatio: "16:9",
    duration: 10,
    prompt:
      "Two lovers embrace by candlelight in a stone chamber. The mood turns tense as she senses danger and steps back, hand on her sword. Flickering shadows, slow dolly-in, high-end fantasy realism.",
  },
];

/** Sample clips available to the preview; keyed by media id so posters stay in sync. */
export const videoSampleAssets: readonly MediaId[] = [
  "fairyWorldFilm",
  "mechaWarFilm",
  "manchesterDerbyFilm",
  "maskTiktokFilm",
];

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
