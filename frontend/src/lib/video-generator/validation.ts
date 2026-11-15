import {
  allVideoResolutions,
  CLIP_MIME_TYPES,
  defaultVideoSettings,
  FRAME_MIME_TYPES,
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  MAX_FRAME_BYTES,
  MAX_REFERENCE_LIMIT,
  MAX_VIDEO_PROMPT_LENGTH,
  MIN_CLIP_SECONDS,
  videoCounts,
  videoModels,
} from "@/components/video-generator/constants";
import type { ClipDescriptor, FrameDescriptor, VideoGenerationRequest, VideoMode } from "@/types/video-generator";

export type VideoGenerationValidation =
  | { ok: true; data: VideoGenerationRequest }
  | { ok: false; error: { code: "VALIDATION_ERROR"; message: string; fields?: Record<string, string> } };

const settingKeys = new Set([...Object.keys(defaultVideoSettings), "inputs"]);
const inputKeys = new Set(["start", "end", "references", "clip"]);
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validId(id: unknown): id is string {
  return typeof id === "string" && ID_PATTERN.test(id) && !/^(?:https?:|data:|blob:)/i.test(id);
}

/** Accept descriptors only; pixels, footage and remote URLs never enter this demo API. */
export function validateVideoGenerationRequest(input: unknown): VideoGenerationValidation {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Send an object containing video settings and input metadata." },
    };
  }
  const record = input;
  const fields: Record<string, string> = {};
  if (Object.keys(input).some((key) => !settingKeys.has(key)))
    fields.request = "Only video settings and input descriptors are accepted.";

  function choice<T extends string>(field: string, options: readonly T[], message = "Choose a supported option."): T {
    const value = record[field];
    if (typeof value === "string" && options.includes(value as T)) return value as T;
    fields[field] = message;
    return options[0];
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
  function frame(field: string, value: unknown): FrameDescriptor | null {
    if (value === null || value === undefined) return null;
    if (!isRecord(value) || Object.keys(value).some((key) => !["id", "mimeType", "size"].includes(key))) {
      fields[field] = "An image may contain only id, mimeType, and size.";
      return null;
    }
    const { id, mimeType, size } = value;
    if (!validId(id)) fields[`${field}.id`] = "Use an ID of 1–128 letters, numbers, or ID punctuation.";
    if (typeof mimeType !== "string" || !FRAME_MIME_TYPES.some((type) => type === mimeType))
      fields[`${field}.mimeType`] = "Use a JPEG, PNG, or WebP image.";
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_FRAME_BYTES)
      fields[`${field}.size`] = `Each image must be no larger than ${MAX_FRAME_BYTES} bytes.`;
    return Object.keys(fields).some((key) => key.startsWith(field))
      ? null
      : { id: id as string, mimeType: mimeType as string, size: size as number };
  }
  function clip(value: unknown): ClipDescriptor | null {
    if (value === null || value === undefined) return null;
    const field = "inputs.clip";
    if (!isRecord(value) || Object.keys(value).some((key) => !["id", "mimeType", "size", "duration"].includes(key))) {
      fields[field] = "A clip may contain only id, mimeType, size, and duration.";
      return null;
    }
    const { id, mimeType, size, duration } = value;
    if (!validId(id)) fields[`${field}.id`] = "Use an ID of 1–128 letters, numbers, or ID punctuation.";
    if (typeof mimeType !== "string" || !CLIP_MIME_TYPES.some((type) => type === mimeType))
      fields[`${field}.mimeType`] = "Use an MP4, MOV, or WebM clip.";
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_CLIP_BYTES)
      fields[`${field}.size`] = `The clip must be no larger than ${MAX_CLIP_BYTES} bytes.`;
    if (
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration < MIN_CLIP_SECONDS ||
      duration > MAX_CLIP_SECONDS
    )
      fields[`${field}.duration`] = `Use a clip of ${MIN_CLIP_SECONDS}–${MAX_CLIP_SECONDS} seconds.`;
    return Object.keys(fields).some((key) => key.startsWith(field))
      ? null
      : { id: id as string, mimeType: mimeType as string, size: size as number, duration: duration as number };
  }

  const modelId = choice(
    "model",
    videoModels.map((model) => model.id),
  );
  const model = videoModels.find((item) => item.id === modelId) ?? videoModels[0];
  const promptValue = record.prompt;
  let prompt = "";
  if (typeof promptValue !== "string") fields.prompt = "Enter text for this setting.";
  else {
    prompt = promptValue.trim();
    if (prompt.length > MAX_VIDEO_PROMPT_LENGTH) fields.prompt = `Use ${MAX_VIDEO_PROMPT_LENGTH} characters or fewer.`;
  }
  const mode = choice<VideoMode>("mode", ["text", "image", "reference", "motion"]);
  if (!fields.mode && !model.modes.includes(mode)) fields.mode = `${model.name} doesn’t support this mode.`;
  const aspectRatio = choice(
    "aspectRatio",
    model.aspectRatios,
    `${model.name} supports ${model.aspectRatios.join(", ")}.`,
  );
  const resolution = choice("resolution", allVideoResolutions);
  if (!fields.resolution && !model.resolutions.includes(resolution))
    fields.resolution = `${model.name} renders at ${model.resolutions.join(", ")}.`;
  const duration = integer("duration", 1, 60);
  if (!fields.duration && !model.durations.includes(duration))
    fields.duration = `${model.name} doesn’t support ${duration} second clips.`;
  const count = integer("count", 1, 4);
  if (!videoCounts.some((value) => value === count)) fields.count = "Choose a supported number of videos.";
  const audio = boolean("audio");
  if (audio && !model.audio) fields.audio = `${model.name} doesn’t generate sound.`;
  const enhancePrompt = boolean("enhancePrompt");

  const inputs: VideoGenerationRequest["inputs"] = { start: null, end: null, references: [], clip: null };
  const raw = record.inputs;
  if (!isRecord(raw) || Object.keys(raw).some((key) => !inputKeys.has(key)) || !Array.isArray(raw.references)) {
    fields.inputs = "Provide start, end, references, and clip descriptors.";
  } else {
    inputs.start = frame("inputs.start", raw.start);
    inputs.end = frame("inputs.end", raw.end);
    inputs.clip = clip(raw.clip);
    if (raw.references.length > MAX_REFERENCE_LIMIT)
      fields["inputs.references"] = `Use up to ${MAX_REFERENCE_LIMIT} references.`;
    else
      raw.references.forEach((reference: unknown, index: number) => {
        const descriptor = frame(`inputs.references.${index}`, reference);
        if (descriptor) inputs.references.push(descriptor);
      });
    const ids = [inputs.start, inputs.end, ...inputs.references, inputs.clip].filter(Boolean).map((item) => item!.id);
    if (new Set(ids).size !== ids.length) fields.inputs = "Each attachment needs its own ID.";

    const unexpected = (present: boolean, field: string, message: string) => {
      if (present && !fields[field]) fields[field] = message;
    };
    if (mode === "text") {
      unexpected(
        Boolean(inputs.start || inputs.end || inputs.references.length || inputs.clip),
        "inputs",
        "Text to video doesn’t use attachments.",
      );
      if (!prompt && !fields.prompt) fields.prompt = "Describe the video you want to explore.";
    }
    if (mode === "image") {
      if (!inputs.start && !fields["inputs.start"]) fields["inputs.start"] = "Add a start image to animate.";
      unexpected(Boolean(inputs.end) && !model.endFrame, "inputs.end", `${model.name} doesn’t support end frames.`);
      unexpected(
        Boolean(inputs.references.length || inputs.clip),
        "inputs",
        "Image to video uses only start and end frames.",
      );
    }
    if (mode === "reference") {
      if (!inputs.references.length && !fields["inputs.references"])
        fields["inputs.references"] = "Add at least one reference image.";
      unexpected(
        inputs.references.length > model.maxReferences,
        "inputs.references",
        `${model.name} accepts up to ${model.maxReferences} references.`,
      );
      unexpected(
        Boolean(inputs.start || inputs.end || inputs.clip),
        "inputs",
        "Reference to video uses only reference images.",
      );
      if (!prompt && !fields.prompt) fields.prompt = "Describe how your references come together.";
    }
    if (mode === "motion") {
      if (!inputs.start && !fields["inputs.start"]) fields["inputs.start"] = "Add a character image.";
      if (!inputs.clip && !fields["inputs.clip"]) fields["inputs.clip"] = "Add a motion clip to copy.";
      unexpected(
        Boolean(inputs.end || inputs.references.length),
        "inputs",
        "Motion control uses a character image and a clip.",
      );
    }
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Check the video settings and try again.", fields },
    };
  }
  return {
    ok: true,
    data: { model: model.id, prompt, mode, aspectRatio, resolution, duration, count, audio, enhancePrompt, inputs },
  };
}
