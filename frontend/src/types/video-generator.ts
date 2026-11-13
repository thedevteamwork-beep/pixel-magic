import type { MediaId } from "./landing";

/** text: prompt only · image: animate a start frame · frames: interpolate start → end. */
export type VideoMode = "text" | "image" | "frames";
export type VideoResolution = "480p" | "720p" | "1080p";

export type VideoSettings = {
  model: string;
  prompt: string;
  mode: VideoMode;
  aspectRatio: string;
  resolution: VideoResolution;
  duration: number;
  count: number;
  motion: string;
  motionStrength: number;
  audio: boolean;
  enhancePrompt: boolean;
  seed: number | null;
  negativePrompt: string;
};

export type FrameSlot = "start" | "end";

export type FrameImage = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  source: "upload" | "sample" | "capture";
  width: number;
  height: number;
};
export type FrameDescriptor = Pick<FrameImage, "id" | "mimeType" | "size">;

export type VideoGenerationRequest = VideoSettings & {
  frames: { start: FrameDescriptor | null; end: FrameDescriptor | null };
};

export type VideoResult = {
  id: string;
  batchId: string;
  url: string;
  poster: string;
  alt: string;
  prompt: string;
  model: string;
  mode: VideoMode;
  aspectRatio: string;
  resolution: VideoResolution;
  duration: number;
  motion: string;
  audio: boolean;
  seed: number;
  createdAt: string;
  favorite: boolean;
  demo: true;
};

export type VideoGenerationResponse = {
  id: string;
  demo: true;
  creditsCharged: 0;
  estimatedCredits: number;
  videos: VideoResult[];
};

export type VideoModel = {
  id: string;
  name: string;
  maker: string;
  description: string;
  symbol: string;
  tag?: string;
  /** Capabilities drive which controls are shown, so switching models never leaves an impossible combination. */
  durations: readonly number[];
  resolutions: readonly VideoResolution[];
  aspectRatios: readonly string[];
  endFrame: boolean;
  audio: boolean;
  /** Indicative credits per second at each resolution, for the pre-flight estimate. */
  creditsPerSecond: Readonly<Record<VideoResolution, number>>;
  /** Typical seconds to render one second of 720p footage. */
  speed: number;
};

export type MotionPreset = {
  id: string;
  name: string;
  group: "Camera" | "Orbit" | "Dynamic" | "Subtle";
  description: string;
  instruction: string;
  /** Orbit-style moves read best with one clear, centered subject. */
  needsSubject?: boolean;
  /** Asset shown in the animated preview card. */
  asset: MediaId;
};

export type VideoInspiration = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  asset: MediaId;
  aspectRatio: string;
  motion: string;
  duration: number;
};

/** A render the user started; shown as a live card until its videos are revealed. */
export type RenderJob = {
  id: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  duration: number;
  resolution: VideoResolution;
  count: number;
  motion: string;
  startedAt: number;
  /** Total simulated render time in ms. */
  eta: number;
  /** Start frame shown inside the placeholder while rendering. */
  frameUrl?: string;
  status: "rendering" | "failed";
  error?: string;
};
