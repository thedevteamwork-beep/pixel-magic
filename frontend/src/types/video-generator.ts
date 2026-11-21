import type { PublicModel } from "@/lib/api/types";
import type { MediaId } from "./landing";

/**
 * text: prompt only · image: animate a start (and optional end) frame ·
 * reference: keep characters, products or style from reference images ·
 * motion: copy the movement in a clip onto a character image.
 */
export type VideoMode = "text" | "image" | "reference" | "motion";
/** As the model names it: "720p", "1080p", "4K"… Empty when the model has no resolution choice. */
export type VideoResolution = string;

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

export type VideoResult = {
  id: string;
  /** The job that made it: videos from one Generate share a batch. */
  batchId: string;
  jobId: string;
  url: string;
  /** A still to show before the video plays: the start image, when there was one. */
  poster?: string;
  alt: string;
  prompt: string;
  model: string;
  mode: VideoMode;
  aspectRatio: string;
  resolution: VideoResolution;
  duration: number;
  audio: boolean;
  creditCost: number;
  createdAt: string;
  favorite: boolean;
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
  /** Typical seconds to render one second of 720p footage, for the wait estimate. */
  speed: number;
  /** The model as `GET /v1/models` returned it; jobs are built from this. */
  source: PublicModel;
};

/** Display details the backend doesn't carry, keyed by model key. */
export type VideoModelPresentation = {
  maker: string;
  symbol: string;
  description?: string;
  tag?: VideoModel["tag"];
  speed?: number;
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
  /** Expected render time in ms, for the progress estimate. */
  eta: number;
  /** Image shown inside the placeholder while rendering. */
  frameUrl?: string;
  status: "rendering" | "failed";
  error?: string;
};
