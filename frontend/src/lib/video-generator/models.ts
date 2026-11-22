import type { FieldSchema, JobView, PublicModel } from "@/lib/api/types";
import { ESTIMATE_PROMPT, placeholderUploadId } from "@/lib/generate/estimate";
import type {
  VideoMode,
  VideoModel,
  VideoModelPresentation,
  VideoResult,
  VideoSettings,
} from "@/types/video-generator";

/** The backend's field names for the settings the studio shows. */
export const VIDEO_FIELDS = {
  duration: "duration",
  resolution: "resolution",
  aspectRatio: "aspect_ratio",
  audio: "audio",
  /** The start frame (Image to Video), or the character (Motion Control). */
  image: "image",
  /** The frame to land on; needs a start frame. */
  end: "end_image",
  /** People, products or styles to keep (Reference to Video). */
  references: "reference_images",
  /** The clip whose movement is copied (Motion Control). */
  clip: "video",
} as const;

const DEFAULT_SPEED = 6;

type EnumField = Extract<FieldSchema, { type: "string" }> & { enum: string[] };

function enumOf(field: FieldSchema | undefined): string[] {
  return field?.type === "string" && (field as EnumField).enum ? [...(field as EnumField).enum] : [];
}

/** "360p" → 360, "4K"/"4k" → 2160, "1440p" → 1440: for ordering and "nearest". */
export function resolutionRank(value: string): number {
  if (/^4k$/i.test(value)) return 2160;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : 0;
}

/** A few labelled stops under a long duration slider: first, last and evenly between. */
function marksFor(durations: readonly number[]): number[] | undefined {
  if (durations.length <= 6) return undefined;
  const steps = 4;
  const marks = Array.from({ length: steps + 1 }, (_, index) => {
    const position = Math.round((index * (durations.length - 1)) / steps);
    return durations[position];
  });
  return [...new Set(marks)];
}

type UploadField = Extract<FieldSchema, { type: "image" | "video" }>;

function uploadField(field: FieldSchema | undefined): UploadField | undefined {
  return field?.type === "image" || field?.type === "video" ? field : undefined;
}

/**
 * The modes a model's upload fields allow. A clip makes it Motion Control
 * only (it needs the clip and a character). Otherwise: Image to Video with a
 * start frame, Reference to Video with reference images, and Text to Video
 * when no upload is required.
 */
function modesOf(input: PublicModel["input"]): VideoMode[] {
  if (uploadField(input[VIDEO_FIELDS.clip])?.type === "video") return ["motion"];
  const uploads = Object.values(input).filter((field) => uploadField(field));
  const modes: VideoMode[] = [];
  if (!uploads.some((field) => uploadField(field)?.required)) modes.push("text");
  if (uploadField(input[VIDEO_FIELDS.image])) modes.push("image");
  if (uploadField(input[VIDEO_FIELDS.references])) modes.push("reference");
  return modes;
}

/** A backend video model as the studio describes it: its modes and settings come from its schema. */
export function toVideoModel(model: PublicModel, presentation?: VideoModelPresentation): VideoModel {
  const input = model.input;
  const durations = enumOf(input[VIDEO_FIELDS.duration])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const modes = modesOf(input);
  const references = uploadField(input[VIDEO_FIELDS.references]);
  const clip = uploadField(input[VIDEO_FIELDS.clip]);
  return {
    id: model.key,
    name: model.name,
    maker: presentation?.maker ?? "",
    description: presentation?.description ?? model.description,
    symbol: presentation?.symbol ?? model.name.slice(0, 1),
    tag: presentation?.tag,
    modes,
    durations: durations.length ? durations : [5],
    durationMarks: marksFor(durations),
    resolutions: enumOf(input[VIDEO_FIELDS.resolution]).sort((a, b) => resolutionRank(a) - resolutionRank(b)),
    aspectRatios: enumOf(input[VIDEO_FIELDS.aspectRatio]),
    endFrame: Boolean(uploadField(input[VIDEO_FIELDS.end])),
    maxReferences: references?.maxItems ?? 0,
    clipTypes: clip ? [...clip.supportedContentTypes] : [],
    audio: input[VIDEO_FIELDS.audio]?.type === "boolean",
    speed: presentation?.speed ?? DEFAULT_SPEED,
    source: model,
  };
}

/** The job's settings, by the model's own field names: only what it declares. Duration is sent as the model names it. */
export function jobValues(model: VideoModel, settings: VideoSettings): Record<string, string | boolean> {
  const input = model.source.input;
  const values: Record<string, string | boolean> = {};
  if (input[VIDEO_FIELDS.duration]) values[VIDEO_FIELDS.duration] = String(settings.duration);
  if (input[VIDEO_FIELDS.resolution] && model.resolutions.includes(settings.resolution))
    values[VIDEO_FIELDS.resolution] = settings.resolution;
  if (input[VIDEO_FIELDS.aspectRatio] && model.aspectRatios.includes(settings.aspectRatio))
    values[VIDEO_FIELDS.aspectRatio] = settings.aspectRatio;
  if (input[VIDEO_FIELDS.audio]) values[VIDEO_FIELDS.audio] = settings.audio;
  return values;
}

/** The uploads a job of this mode sends, by field: only what the mode and the model use. */
export function uploadFieldsFor<T>(
  model: VideoModel,
  mode: VideoMode,
  inputs: { start: T | null; end: T | null; references: readonly T[]; clip: T | null },
): Record<string, T[]> {
  const fields: Record<string, T[]> = {};
  if ((mode === "image" || mode === "motion") && inputs.start) fields[VIDEO_FIELDS.image] = [inputs.start];
  if (mode === "image" && inputs.start && inputs.end && model.endFrame) fields[VIDEO_FIELDS.end] = [inputs.end];
  if (mode === "reference" && inputs.references.length)
    fields[VIDEO_FIELDS.references] = inputs.references.slice(0, model.maxReferences);
  if (mode === "motion" && inputs.clip) fields[VIDEO_FIELDS.clip] = [inputs.clip];
  return fields;
}

/** A clip's length as the price counts it: seconds, a stand-in before there is a clip. */
const STAND_IN_CLIP_SECONDS = 5;

/**
 * The body to price these settings with (`POST /v1/credits/estimate`): the
 * input a job would send, with stand-ins for the prompt and the uploads, and
 * for motion control the clip's length, which the price follows.
 */
export function estimateBody(
  model: VideoModel,
  settings: VideoSettings,
  inputs: { start: unknown; end: unknown; references: readonly unknown[]; clip: { duration: number } | null },
): { plugin: string; operation: string; input: Record<string, unknown>; videoSeconds?: number } {
  const input: Record<string, unknown> = { ...jobValues(model, settings) };
  if (model.source.input.prompt) input.prompt = ESTIMATE_PROMPT;
  // Every upload the job would have, as stand-ins: the price counts them, never reads them.
  let index = 0;
  const stand = {
    start: inputs.start ?? true,
    end: inputs.end,
    references: inputs.references.length ? inputs.references : [true],
    clip: inputs.clip ?? true,
  };
  for (const [field, files] of Object.entries(uploadFieldsFor(model, settings.mode, stand)))
    input[field] = files.map(() => placeholderUploadId(index++));
  const { plugin, operation } = model.source;
  if (!model.clipTypes.length) return { plugin, operation, input };
  const seconds = inputs.clip?.duration ?? STAND_IN_CLIP_SECONDS;
  return { plugin, operation, input, videoSeconds: Math.min(30, Math.max(0.1, Math.round(seconds * 10) / 10)) };
}

const has = (input: Record<string, unknown>, field: string) =>
  Array.isArray(input[field]) && (input[field] as unknown[]).length > 0;

/** The mode a job was made in, from the uploads it sent. */
function modeOfJob(input: Record<string, unknown>): VideoMode {
  if (has(input, VIDEO_FIELDS.clip)) return "motion";
  if (has(input, VIDEO_FIELDS.references)) return "reference";
  return has(input, VIDEO_FIELDS.image) ? "image" : "text";
}

/** The studio settings a finished job was made with, read back from its input. */
function settingsOf(job: JobView) {
  const input = job.input;
  const duration = Number(input[VIDEO_FIELDS.duration]);
  return {
    mode: modeOfJob(input),
    duration: Number.isFinite(duration) ? duration : 0,
    resolution: typeof input[VIDEO_FIELDS.resolution] === "string" ? (input[VIDEO_FIELDS.resolution] as string) : "",
    aspectRatio:
      typeof input[VIDEO_FIELDS.aspectRatio] === "string" ? (input[VIDEO_FIELDS.aspectRatio] as string) : "16:9",
    audio: input[VIDEO_FIELDS.audio] === true,
    prompt: typeof input.prompt === "string" ? input.prompt : "",
  };
}

/**
 * The video of a completed job; other jobs have none. Videos are grouped by
 * their video idea (the job's project), so every take of an idea sits
 * together; a job outside a project is its own group.
 */
export function jobToVideoResults(job: JobView, options: { batchId?: string; poster?: string } = {}): VideoResult[] {
  if (job.status !== "completed") return [];
  const read = settingsOf(job);
  return job.outputs.flatMap((output) =>
    output.url
      ? [
          {
            id: `${job.jobId}:${output.index}`,
            batchId: options.batchId ?? job.projectId ?? job.jobId,
            jobId: job.jobId,
            url: output.url,
            poster: options.poster,
            alt: read.prompt ? `Generated video: ${read.prompt}` : "Generated video",
            prompt: read.prompt,
            model: job.model,
            mode: read.mode,
            aspectRatio: read.aspectRatio,
            resolution: read.resolution,
            duration: read.duration,
            audio: read.audio,
            creditCost: job.creditCost,
            createdAt: job.completedAt ?? job.createdAt,
            favorite: false,
          },
        ]
      : [],
  );
}
