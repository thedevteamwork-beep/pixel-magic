import {
  allVideoResolutions,
  defaultVideoSettings,
  FRAME_MIME_TYPES,
  MAX_FRAME_BYTES,
  MAX_NEGATIVE_PROMPT_LENGTH,
  MAX_VIDEO_PROMPT_LENGTH,
  motionPresets,
  videoCounts,
  videoModels,
} from "@/constants/video-generator";
import type { FrameDescriptor, VideoGenerationRequest, VideoMode } from "@/types/video-generator";

export type VideoGenerationValidation =
  | { ok: true; data: VideoGenerationRequest }
  | { ok: false; error: { code: "VALIDATION_ERROR"; message: string; fields?: Record<string, string> } };

const settingKeys = new Set([...Object.keys(defaultVideoSettings), "frames"]);
const frameKeys = new Set(["id", "mimeType", "size"]);
const MAX_SEED = 4_294_967_295;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Accept frame descriptors only; pixels and remote URLs never enter this demo API. */
export function validateVideoGenerationRequest(input: unknown): VideoGenerationValidation {
  if (!isRecord(input)) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Send an object containing video settings and frame metadata." } };
  }
  const record = input;
  const fields: Record<string, string> = {};
  if (Object.keys(input).some((key) => !settingKeys.has(key))) fields.request = "Only video settings and frame descriptors are accepted.";

  function choice<T extends string>(field: string, options: readonly T[], message = "Choose a supported option."): T {
    const value = record[field];
    if (typeof value === "string" && options.includes(value as T)) return value as T;
    fields[field] = message;
    return options[0];
  }
  function text(field: string, maximum: number): string {
    const value = record[field];
    if (typeof value !== "string") { fields[field] = "Enter text for this setting."; return ""; }
    const normalized = value.trim();
    if (normalized.length > maximum) fields[field] = `Use ${maximum} characters or fewer.`;
    return normalized;
  }
  function boolean(field: string): boolean {
    const value = record[field];
    if (typeof value === "boolean") return value;
    fields[field] = "Choose true or false.";
    return false;
  }
  function integer(field: string, minimum: number, maximum: number): number {
    const value = record[field];
    if (typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum) return value;
    fields[field] = `Use a whole number from ${minimum} to ${maximum}.`;
    return minimum;
  }
  function frame(slot: "start" | "end", value: unknown): FrameDescriptor | null {
    if (value === null) return null;
    const field = `frames.${slot}`;
    if (!isRecord(value) || Object.keys(value).some((key) => !frameKeys.has(key))) {
      fields[field] = "A frame may contain only id, mimeType, and size.";
      return null;
    }
    const { id, mimeType, size } = value;
    if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id) || /^(?:https?:|data:|blob:)/i.test(id)) fields[`${field}.id`] = "Use a frame ID of 1–128 letters, numbers, or ID punctuation.";
    if (typeof mimeType !== "string" || !FRAME_MIME_TYPES.some((type) => type === mimeType)) fields[`${field}.mimeType`] = "Use a JPEG, PNG, or WebP frame.";
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_FRAME_BYTES) fields[`${field}.size`] = `Each frame must be no larger than ${MAX_FRAME_BYTES} bytes.`;
    return Object.keys(fields).some((key) => key.startsWith(field)) ? null : { id: id as string, mimeType: mimeType as string, size: size as number };
  }

  const modelId = choice("model", videoModels.map((model) => model.id));
  const model = videoModels.find((item) => item.id === modelId) ?? videoModels[0];
  const prompt = text("prompt", MAX_VIDEO_PROMPT_LENGTH);
  const mode = choice<VideoMode>("mode", ["text", "image", "frames"]);
  const aspectRatio = choice("aspectRatio", model.aspectRatios, `${model.name} supports ${model.aspectRatios.join(", ")}.`);
  const resolution = choice("resolution", allVideoResolutions);
  if (!fields.resolution && !model.resolutions.includes(resolution)) fields.resolution = `${model.name} renders at ${model.resolutions.join(", ")}.`;
  const duration = integer("duration", 1, 60);
  if (!fields.duration && !model.durations.includes(duration)) fields.duration = `${model.name} supports ${model.durations.join(", ")} second clips.`;
  const count = integer("count", 1, 4);
  if (!videoCounts.some((value) => value === count)) fields.count = "Choose a supported number of videos.";
  const motion = choice("motion", motionPresets.map((preset) => preset.id));
  const motionStrength = integer("motionStrength", 0, 100);
  const audio = boolean("audio");
  if (audio && !model.audio) fields.audio = `${model.name} doesn’t generate sound.`;
  const enhancePrompt = boolean("enhancePrompt");
  const seed = record.seed === null ? null : integer("seed", 0, MAX_SEED);
  const negativePrompt = text("negativePrompt", MAX_NEGATIVE_PROMPT_LENGTH);

  let start: FrameDescriptor | null = null;
  let end: FrameDescriptor | null = null;
  if (!isRecord(record.frames) || Object.keys(record.frames).some((key) => key !== "start" && key !== "end")) {
    fields.frames = "Provide start and end frame descriptors, or null.";
  } else {
    start = frame("start", record.frames.start ?? null);
    end = frame("end", record.frames.end ?? null);
    if (start && end && start.id === end.id) fields["frames.end"] = "Use a different image for the end frame.";
    if (mode === "text" && (start || end)) fields.frames = "Switch to image mode to animate a frame.";
    if (mode !== "text" && !start && !fields["frames.start"]) fields["frames.start"] = "Add a start frame to animate.";
    if (mode === "frames" && !end && !fields["frames.end"]) fields["frames.end"] = "Add an end frame to land on.";
    if (mode === "image" && end) fields["frames.end"] = "Switch to start & end mode to use an end frame.";
    if (mode === "frames" && !model.endFrame) fields.mode = `${model.name} doesn’t support end frames.`;
  }
  if (!prompt && mode === "text" && !fields.prompt) fields.prompt = "Describe the video you want to explore.";

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Check the video settings and try again.", fields } };
  }
  return {
    ok: true,
    data: { model: model.id, prompt, mode, aspectRatio, resolution, duration, count, motion, motionStrength, audio, enhancePrompt, seed, negativePrompt, frames: { start, end } },
  };
}
