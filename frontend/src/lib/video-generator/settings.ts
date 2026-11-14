import { defaultVideoSettings, motionPresets, videoModels } from "@/components/video-generator/constants";
import type { VideoModel, VideoResolution, VideoResult, VideoSettings } from "@/types/video-generator";

export function getVideoModel(id: string): VideoModel {
  return videoModels.find((model) => model.id === id) ?? videoModels[0];
}

function nearest(options: readonly number[], value: number): number {
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
  model: VideoModel = getVideoModel(settings.model),
): { settings: VideoSettings; adjustments: string[] } {
  const next = { ...settings, model: model.id };
  const adjustments: string[] = [];
  if (!model.durations.includes(next.duration)) {
    const duration = nearest(model.durations, next.duration);
    adjustments.push(`${next.duration}s → ${duration}s`);
    next.duration = duration;
  }
  if (!model.resolutions.includes(next.resolution)) {
    const order: readonly VideoResolution[] = ["480p", "720p", "1080p"];
    const resolution = nearest(
      model.resolutions.map((value) => order.indexOf(value)),
      order.indexOf(next.resolution),
    );
    adjustments.push(`${next.resolution} → ${order[resolution]}`);
    next.resolution = order[resolution];
  }
  if (!model.aspectRatios.includes(next.aspectRatio)) {
    adjustments.push(`${next.aspectRatio} → ${model.aspectRatios[0]}`);
    next.aspectRatio = model.aspectRatios[0];
  }
  if (next.audio && !model.audio) {
    adjustments.push("sound off");
    next.audio = false;
  }
  if (next.mode === "frames" && !model.endFrame) {
    adjustments.push("end frame not supported");
    next.mode = "image";
  }
  return { settings: next, adjustments };
}

const resolutionTime: Record<VideoResolution, number> = { "480p": 0.6, "720p": 1, "1080p": 1.8 };

/** Indicative credits for a real render. Sound adds a quarter. */
export function estimateCredits(
  settings: Pick<VideoSettings, "model" | "resolution" | "duration" | "count" | "audio">,
): number {
  const model = getVideoModel(settings.model);
  const perClip =
    model.creditsPerSecond[settings.resolution] * settings.duration * (settings.audio && model.audio ? 1.25 : 1);
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

export function motionIntensity(strength: number): "subtle" | "moderate" | "strong" {
  return strength < 34 ? "subtle" : strength < 67 ? "moderate" : "strong";
}

/** Keep the brief first; camera direction is appended once, in plain language. */
export function composeVideoPrompt(
  prompt: string,
  motion: string,
  strength = defaultVideoSettings.motionStrength,
): string {
  const brief = prompt.trim();
  const instruction = motionPresets.find((preset) => preset.id === motion)?.instruction;
  if (!instruction) return brief;
  const camera = `Camera: ${instruction} Keep the movement ${motionIntensity(strength)}.`;
  return brief ? `${brief}\n\n${camera}` : camera;
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

/** File name for a downloaded sample clip. */
export function downloadName(item: Pick<VideoResult, "id">) {
  return `pixel-magic-sample-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}.mp4`;
}
