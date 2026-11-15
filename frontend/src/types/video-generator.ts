import type { MediaId } from "./landing";

/**
 * text: prompt only · image: animate a start (and optional end) frame ·
 * reference: keep characters, products or style from reference images ·
 * motion: copy the movement in a clip onto a character image.
 */
export type VideoMode = "text" | "image" | "reference" | "motion";
export type VideoResolution = "480p" | "720p" | "1080p";

export type VideoSettings = {
  model: string;
  prompt: string;
  mode: VideoMode;
  aspectRatio: string;
  resolution: VideoResolution;
  duration: number;
  count: number;
  audio: boolean;
  enhancePrompt: boolean;
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

/** A short clip whose movement is transferred in motion control. */
export type MotionClip = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  duration: number;
  width: number;
  height: number;
};
export type ClipDescriptor = Pick<MotionClip, "id" | "mimeType" | "size" | "duration">;

/** Everything a user can attach. Only the parts the mode and model use are sent. */
export type VideoInputs = {
  start: FrameImage | null;
  end: FrameImage | null;
  references: FrameImage[];
  clip: MotionClip | null;
};

export type VideoGenerationRequest = VideoSettings & {
  inputs: {
    start: FrameDescriptor | null;
    end: FrameDescriptor | null;
    references: FrameDescriptor[];
    clip: ClipDescriptor | null;
  };
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
  audio: boolean;
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
  tag?: "Top" | "New" | "Fast" | "Audio";
  /** Capabilities drive which inputs and settings are shown, so no impossible combination can be chosen. */
  modes: readonly VideoMode[];
  /** Every selectable length, in seconds, ascending. */
  durations: readonly number[];
  /** Labels under the duration slider when there are many stops. */
  durationMarks?: readonly number[];
  resolutions: readonly VideoResolution[];
  aspectRatios: readonly string[];
  /** Image to video can also land on an end frame. */
  endFrame: boolean;
  /** Reference to video accepts up to this many images. */
  maxReferences: number;
  audio: boolean;
  /** Indicative credits per second at each resolution, for the pre-flight estimate. */
  creditsPerSecond: Readonly<Record<VideoResolution, number>>;
  /** Typical seconds to render one second of 720p footage. */
  speed: number;
};

export type VideoModeOption = {
  id: VideoMode;
  name: string;
  description: string;
  isNew?: boolean;
};

export type VideoInspiration = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  asset: MediaId;
  aspectRatio: string;
  duration: number;
};

/** A render the user started; shown as a live card until its videos are revealed. */
export type RenderJob = {
  id: string;
  prompt: string;
  model: string;
  mode: VideoMode;
  aspectRatio: string;
  duration: number;
  resolution: VideoResolution;
  count: number;
  startedAt: number;
  /** Total simulated render time in ms. */
  eta: number;
  /** Image shown inside the placeholder while rendering. */
  frameUrl?: string;
  status: "rendering" | "failed";
  error?: string;
};
