import { videoModels, videoModes } from "@/constants/video-generator";
import type { MotionClip, VideoMode, VideoModel, VideoResolution, VideoSettings } from "@/types/video-generator";

export function getVideoModel(id: string): VideoModel {
  return videoModels.find((model) => model.id === id) ?? videoModels[0];
}

export function modelsForMode(mode: VideoMode): readonly VideoModel[] {
  return videoModels.filter((model) => model.modes.includes(mode));
}

export function modeName(mode: VideoMode): string {
  return videoModes.find((option) => option.id === mode)?.name ?? mode;
}

export function nearestDuration(options: readonly number[], value: number): number {
  return options.reduce((best, option) => Math.abs(option - value) < Math.abs(best - value) ? option : best, options[0]);
}

/**
 * Fit settings to what a model can do. Each adjustment is described in plain
 * language so the UI can tell people what changed instead of silently swapping.
 */
export function fitSettingsToModel(settings: VideoSettings, model: VideoModel = getVideoModel(settings.model)): { settings: VideoSettings; adjustments: string[] } {
  const next = { ...settings, model: model.id };
  const adjustments: string[] = [];
  if (!model.modes.includes(next.mode)) {
    adjustments.push(`${modeName(next.mode)} → ${modeName(model.modes[0])}`);
    next.mode = model.modes[0];
  }
  if (!model.durations.includes(next.duration)) {
    const duration = nearestDuration(model.durations, next.duration);
    adjustments.push(`${next.duration}s → ${duration}s`);
    next.duration = duration;
  }
  if (!model.resolutions.includes(next.resolution)) {
    const order: readonly VideoResolution[] = ["480p", "720p", "1080p"];
    const index = nearestDuration(model.resolutions.map((value) => order.indexOf(value)), order.indexOf(next.resolution));
    adjustments.push(`${next.resolution} → ${order[index]}`);
    next.resolution = order[index];
  }
  if (!model.aspectRatios.includes(next.aspectRatio)) {
    adjustments.push(`${next.aspectRatio} → ${model.aspectRatios[0]}`);
    next.aspectRatio = model.aspectRatios[0];
  }
  if (next.audio && !model.audio) {
    adjustments.push("sound off");
    next.audio = false;
  }
  return { settings: next, adjustments };
}

/** Motion control follows the length of the clip, within what the model supports. */
export function effectiveDuration(settings: Pick<VideoSettings, "mode" | "duration" | "model">, clip: Pick<MotionClip, "duration"> | null): number {
  if (settings.mode !== "motion" || !clip) return settings.duration;
  return nearestDuration(getVideoModel(settings.model).durations, clip.duration);
}

const resolutionTime: Record<VideoResolution, number> = { "480p": 0.6, "720p": 1, "1080p": 1.8 };

/** Indicative credits for a real render. Sound adds a quarter. */
export function estimateCredits(settings: Pick<VideoSettings, "model" | "resolution" | "duration" | "count" | "audio">): number {
  const model = getVideoModel(settings.model);
  const perClip = model.creditsPerSecond[settings.resolution] * settings.duration * (settings.audio && model.audio ? 1.25 : 1);
  return Math.ceil(perClip) * settings.count;
}

/** Typical wall-clock seconds for a real render; clips in a batch render in parallel. */
export function estimateRenderSeconds(settings: Pick<VideoSettings, "model" | "resolution" | "duration">): number {
  const model = getVideoModel(settings.model);
  return Math.round(model.speed * settings.duration * resolutionTime[settings.resolution] + 15);
}

/** The preview compresses real render time into a few seconds so the flow can be felt. */
export function previewRenderMs(settings: Pick<VideoSettings, "model" | "resolution" | "duration">): number {
  return Math.round(Math.min(9000, Math.max(3500, estimateRenderSeconds(settings) * 55)));
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `~${Math.max(5, Math.round(seconds / 5) * 5)}s`;
  const minutes = Math.round(seconds / 30) / 2;
  return `~${minutes % 1 ? minutes.toFixed(1) : minutes} min`;
}

export function formatTimecode(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const whole = Math.floor(safe);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** "4s–30s" for a range, "5s · 10s" for a short list. */
export function durationLabel(model: VideoModel): string {
  const values = model.durations;
  const contiguous = values.length > 3 && values.every((value, index) => index === 0 || value - values[index - 1] === 1);
  return contiguous ? `${values[0]}s–${values.at(-1)}s` : values.map((value) => `${value}s`).join(" · ");
}

export function resolutionLabel(model: VideoModel): string {
  return model.resolutions.length > 1 ? `${model.resolutions[0]}–${model.resolutions.at(-1)}` : model.resolutions[0];
}

/** "16:9" → 16/9; anything unexpected falls back to landscape. */
export function ratioValue(aspectRatio: string): number {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspectRatio);
  return match ? Number(match[1]) / Number(match[2]) : 16 / 9;
}

/** The closest supported ratio to an image's natural dimensions. */
export function closestAspectRatio(width: number, height: number, options: readonly string[]): string {
  const target = width / height;
  return options.reduce((best, option) => Math.abs(Math.log(ratioValue(option) / target)) < Math.abs(Math.log(ratioValue(best) / target)) ? option : best, options[0]);
}
