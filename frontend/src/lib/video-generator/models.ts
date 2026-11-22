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
  image: "image",
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

/**
 * A backend video model as the studio describes it. Text to video always;
 * image to video when it takes a start image. Reference and motion control
 * need inputs the backend doesn't take yet, so no model offers them.
 */
export function toVideoModel(model: PublicModel, presentation?: VideoModelPresentation): VideoModel {
  const input = model.input;
  const durations = enumOf(input[VIDEO_FIELDS.duration])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const modes: VideoMode[] = input[VIDEO_FIELDS.image]?.type === "image" ? ["text", "image"] : ["text"];
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
    endFrame: false,
    maxReferences: 0,
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

/** The input to price these settings with, as a job would send it. */
export function estimateInput(model: VideoModel, settings: VideoSettings): Record<string, unknown> {
  const input: Record<string, unknown> = { ...jobValues(model, settings) };
  if (model.source.input.prompt) input.prompt = ESTIMATE_PROMPT;
  if (settings.mode === "image") input[VIDEO_FIELDS.image] = [placeholderUploadId()];
  return input;
}

/** The studio settings a finished job was made with, read back from its input. */
function settingsOf(job: JobView) {
  const input = job.input;
  const duration = Number(input[VIDEO_FIELDS.duration]);
  return {
    mode: (Array.isArray(input[VIDEO_FIELDS.image]) && (input[VIDEO_FIELDS.image] as unknown[]).length > 0
      ? "image"
      : "text") as VideoMode,
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
