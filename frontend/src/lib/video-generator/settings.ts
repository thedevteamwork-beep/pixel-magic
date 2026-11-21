import { videoModes } from "@/components/video-generator/constants";
import type { MotionClip, VideoMode, VideoModel, VideoResult, VideoSettings } from "@/types/video-generator";
import { resolutionRank } from "./models";

/** The model with this id, else the first: an old link or a removed model still opens the studio. */
export function getVideoModel(models: readonly VideoModel[], id: string): VideoModel {
  return models.find((model) => model.id === id) ?? models[0];
}

export function modelsForMode(models: readonly VideoModel[], mode: VideoMode): readonly VideoModel[] {
  return models.filter((model) => model.modes.includes(mode));
}

/** Names for modes the studio doesn't offer yet, so they still read well where they appear. */
const UPCOMING_MODE_NAMES: Partial<Record<VideoMode, string>> = {
  reference: "Reference to Video",
  motion: "Motion Control",
};

export function modeName(mode: VideoMode): string {
  return videoModes.find((option) => option.id === mode)?.name ?? UPCOMING_MODE_NAMES[mode] ?? mode;
}

export function nearestDuration(options: readonly number[], value: number): number {
  return options.reduce(
    (best, option) => (Math.abs(option - value) < Math.abs(best - value) ? option : best),
    options[0],
  );
}

/**
 * Fit settings to what a model can do. Each adjustment is described in plain
 * language so the UI can tell people what changed instead of silently swapping.
 */
export function fitSettingsToModel(
  settings: VideoSettings,
  model: VideoModel,
): { settings: VideoSettings; adjustments: string[] } {
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
  // A model without a resolution choice keeps the setting for the next model; it just isn't sent.
  if (model.resolutions.length && !model.resolutions.includes(next.resolution)) {
    const rank = resolutionRank(next.resolution) || 720;
    const nearest = model.resolutions.reduce((best, option) =>
      Math.abs(resolutionRank(option) - rank) < Math.abs(resolutionRank(best) - rank) ? option : best,
    );
    if (next.resolution) adjustments.push(`${next.resolution} → ${nearest}`);
    next.resolution = nearest;
  }
  if (model.aspectRatios.length && !model.aspectRatios.includes(next.aspectRatio)) {
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
export function effectiveDuration(
  settings: Pick<VideoSettings, "mode" | "duration">,
  clip: Pick<MotionClip, "duration"> | null,
  model: VideoModel,
): number {
  if (settings.mode !== "motion" || !clip) return settings.duration;
  return nearestDuration(model.durations, clip.duration);
}

/** Typical wall-clock seconds for a render; clips in a batch render in parallel. Larger frames take longer. */
export function estimateRenderSeconds(
  model: VideoModel,
  settings: Pick<VideoSettings, "resolution" | "duration">,
): number {
  const scale = (resolutionRank(settings.resolution) || 720) / 720;
  return Math.round(model.speed * settings.duration * Math.max(0.6, scale) + 15);
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
  const contiguous =
    values.length > 3 && values.every((value, index) => index === 0 || value - values[index - 1] === 1);
  return contiguous ? `${values[0]}s–${values.at(-1)}s` : values.map((value) => `${value}s`).join(" · ");
}

export function resolutionLabel(model: VideoModel): string {
  if (!model.resolutions.length) return "Auto";
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
  return options.reduce(
    (best, option) =>
      Math.abs(Math.log(ratioValue(option) / target)) < Math.abs(Math.log(ratioValue(best) / target)) ? option : best,
    options[0],
  );
}

/** File name for a downloaded video. */
export function downloadName(item: Pick<VideoResult, "id">) {
  return `pixel-magic-video-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 24)}.mp4`;
}

/** A shot can be rendered again in 1080p when it is smaller and its model offers 1080p. */
export function canRenderIn1080p(item: Pick<VideoResult, "resolution">, model: VideoModel | undefined): boolean {
  return Boolean(model?.resolutions.includes("1080p")) && (resolutionRank(item.resolution) || 0) < 1080;
}
