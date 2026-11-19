import type { FieldSchema, JobView, PublicModel } from "@/lib/api/types";
import type {
  ImageSize,
  UpscaleControl,
  UpscaleModel,
  UpscalePresentation,
  UpscaleResult,
  UpscaleValue,
  UpscaleValues,
} from "./types";

const FACTOR_FIELD = "upscale_factor";
const MODE_FIELD = "upscale_mode";
const TARGET_FIELD = "target_resolution";

/** Labels the schema's field names don't read well as. */
const LABELS: Record<string, string> = {
  prompt: "Guide the detail",
  enable_prompt_expansion: "Expand my prompt",
  output_format: "File format",
  subject_detection: "Enhance",
};

function labelOf(field: string): string {
  return LABELS[field] ?? field[0].toUpperCase() + field.slice(1).replaceAll("_", " ");
}

function controlOf(field: string, schema: FieldSchema): UpscaleControl | null {
  const base = { field, label: labelOf(field), description: schema.description };
  if (schema.type === "string" && schema.enum)
    return { ...base, kind: "choice", options: schema.enum, default: schema.default ?? schema.enum[0] };
  if (schema.type === "string")
    return { ...base, kind: "text", maxLength: schema.maxLength, default: schema.default ?? "" };
  if (schema.type === "boolean") return { ...base, kind: "toggle", default: schema.default };
  if (schema.type === "integer")
    return { ...base, kind: "slider", min: schema.minimum, max: schema.maximum, default: schema.default };
  return null;
}

/** An upscale model from `GET /v1/models`, with the controls its schema declares. */
export function toUpscaleModel(model: PublicModel, presentation?: UpscalePresentation): UpscaleModel {
  const input = model.input;
  const factor = input[FACTOR_FIELD];
  const mode = input[MODE_FIELD];
  const target = input[TARGET_FIELD];
  const handled = new Set([FACTOR_FIELD, MODE_FIELD, TARGET_FIELD]);
  return {
    key: model.key,
    name: model.name,
    description: model.description,
    maker: presentation?.maker ?? "",
    symbol: presentation?.symbol ?? model.name.slice(0, 1),
    bestFor: presentation?.bestFor ?? model.description,
    tag: presentation?.tag,
    credits: model.credits,
    factor:
      factor?.type === "integer"
        ? { field: FACTOR_FIELD, min: factor.minimum, max: factor.maximum, default: factor.default }
        : undefined,
    target:
      mode?.type === "string" && mode.enum?.includes("target") && target?.type === "string" && target.enum
        ? {
            modeField: MODE_FIELD,
            field: TARGET_FIELD,
            options: target.enum,
            default: target.default ?? target.enum[0],
          }
        : undefined,
    controls: Object.entries(input).flatMap(([field, schema]) =>
      handled.has(field) || schema.type === "image" ? [] : (controlOf(field, schema) ?? []),
    ),
    source: model,
  };
}

/** The model's defaults for every setting the upscaler shows. */
export function defaultValues(model: UpscaleModel): UpscaleValues {
  const values: UpscaleValues = {};
  if (model.factor) values[model.factor.field] = model.factor.default;
  if (model.target) {
    values[model.target.modeField] = "factor";
    values[model.target.field] = model.target.default;
  }
  for (const control of model.controls) values[control.field] = control.default;
  return values;
}

/** Whether these settings scale to a target resolution rather than by a factor. */
export function usesTarget(model: UpscaleModel, values: UpscaleValues): boolean {
  return Boolean(model.target && values[model.target.modeField] === "target");
}

/** The factors offered as buttons: all of a short range, else the useful steps of a long one. */
export function factorChoices(model: UpscaleModel): number[] {
  if (!model.factor) return [];
  const { min, max } = model.factor;
  if (max - min < 5) return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return [...new Set([min, 2, 4, 6, 8, max])].filter((value) => value >= min && value <= max);
}

/** The short side each target resolution names. */
const TARGET_SHORT_SIDE: Record<string, number> = { "720p": 720, "1080p": 1080, "1440p": 1440, "2160p": 2160 };

/** How much each side grows, or null when the model decides. Matches the backend's pricing. */
export function scaleOf(model: UpscaleModel, values: UpscaleValues, size: ImageSize | null): number | null {
  if (usesTarget(model, values) && model.target) {
    const short = TARGET_SHORT_SIDE[String(values[model.target.field])];
    return short && size ? short / Math.min(size.width, size.height) : null;
  }
  if (model.factor) return Number(values[model.factor.field] ?? model.factor.default);
  return null;
}

/** The result's size, or null when the model decides it. */
export function outputSize(model: UpscaleModel, values: UpscaleValues, size: ImageSize | null): ImageSize | null {
  const scale = scaleOf(model, values, size);
  if (!scale || !size) return null;
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}

export function megapixels(size: ImageSize): number {
  return (size.width * size.height) / 1_000_000;
}

/** "5,792 × 4,344". */
export function formatSize(size: ImageSize): string {
  return `${size.width.toLocaleString()} × ${size.height.toLocaleString()}`;
}

/** "25.2 MP", "0.4 MP". */
export function formatMegapixels(size: ImageSize): string {
  const value = megapixels(size);
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} MP`;
}

/** "4×", "2.5×". */
export function formatScale(scale: number): string {
  return `${Number.isInteger(scale) ? scale : scale.toFixed(1)}×`;
}

/** The settings sent with a job: only fields the model declares. */
export function jobValues(model: UpscaleModel, values: UpscaleValues): UpscaleValues {
  return Object.fromEntries(Object.entries(values).filter(([field]) => field in model.source.input));
}

/** The settings a finished job was made with, as upscaler values. */
function valuesOf(job: JobView): UpscaleValues {
  return Object.fromEntries(
    Object.entries(job.input).filter(
      (entry): entry is [string, UpscaleValue] =>
        typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean",
    ),
  );
}

/** A completed upscale job as a result; anything else is null. */
export function jobToUpscaleResult(
  job: JobView,
  models: readonly UpscaleModel[],
  inputSize: ImageSize | null = null,
): UpscaleResult | null {
  const output = job.outputs.find((item) => item.url);
  if (job.status !== "completed" || !output?.url) return null;
  return {
    jobId: job.jobId,
    url: output.url,
    mimeType: output.mimeType,
    model: job.model,
    modelName: models.find((model) => model.key === job.model)?.name ?? job.model,
    values: valuesOf(job),
    creditCost: job.creditCost,
    createdAt: job.completedAt ?? job.createdAt,
    inputSize,
  };
}
