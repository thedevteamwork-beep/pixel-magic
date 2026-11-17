import type { FieldSchema, PublicModel } from "@/lib/api/types";
import { buildInput, imageField, imageFieldName } from "@/lib/generate/formFromSchema";
import type { ImageOptionValue, ModelPresentation, ShapeOption, StudioModel } from "@/types/image-generator";

/** Field names the studio understands; any other enum becomes a plain choice. */
const SHAPE_FIELDS = ["aspect_ratio", "image_size"];
const COUNT_FIELDS = ["num_images"];
const FALLBACK_PROMPT_LIMIT = 2000;
const FALLBACK_PRESENTATION: ModelPresentation = { maker: "Pixel Magic", symbol: "✦" };

type StringField = Extract<FieldSchema, { type: "string" }>;
type IntegerField = Extract<FieldSchema, { type: "integer" }>;

function humanize(value: string): string {
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "portrait_4_3" → 3:4, "square_hd" → 1:1 HD, "16:9" → 16:9. Unknown values keep a readable label. */
export function shapeOption(value: string): ShapeOption {
  if (/^\d+:\d+$/.test(value)) return { value, label: value, ratio: value };
  const named = /^(portrait|landscape)_(\d+)_(\d+)$/.exec(value);
  if (named) {
    const [long, short] = [Number(named[2]), Number(named[3])].sort((a, b) => b - a);
    const ratio = named[1] === "portrait" ? `${short}:${long}` : `${long}:${short}`;
    return { value, label: ratio, ratio };
  }
  // "auto" lets the model pick; it is only ever chosen on purpose, never matched to a ratio.
  if (value === "auto") return { value, label: "Auto", ratio: "1:1" };
  if (value === "square") return { value, label: "1:1", ratio: "1:1" };
  if (value === "square_hd") return { value, label: "1:1 HD", ratio: "1:1" };
  return { value, label: humanize(value), ratio: "1:1" };
}

function ratioNumber(ratio: string): number {
  const [width, height] = ratio.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

function enumField(field: FieldSchema | undefined): field is StringField & { enum: readonly string[] } {
  return field?.type === "string" && Array.isArray(field.enum) && field.enum.length > 0;
}

/** Describes a backend image model by the controls the studio can offer for it. */
export function toStudioModel(
  model: PublicModel,
  presentation: ModelPresentation = FALLBACK_PRESENTATION,
): StudioModel {
  const entries = Object.entries(model.input);
  const shapeName = SHAPE_FIELDS.find((name) => enumField(model.input[name]));
  const shapeField = shapeName ? (model.input[shapeName] as StringField & { enum: readonly string[] }) : undefined;
  const countName = COUNT_FIELDS.find((name) => model.input[name]?.type === "integer");
  const countField = countName ? (model.input[countName] as IntegerField) : undefined;
  const image = imageField(model);
  const imageName = imageFieldName(model);
  const prompt = model.input.prompt;

  return {
    key: model.key,
    name: model.name,
    description: model.description,
    ...presentation,
    credits: model.credits,
    promptMaxLength: prompt?.type === "string" && prompt.maxLength ? prompt.maxLength : FALLBACK_PROMPT_LIMIT,
    shape:
      shapeName && shapeField
        ? {
            field: shapeName,
            options: shapeField.enum.map(shapeOption),
            default: shapeField.default ?? shapeField.enum[0],
          }
        : undefined,
    count:
      countName && countField
        ? { field: countName, min: countField.minimum, max: countField.maximum, default: countField.default }
        : undefined,
    references:
      image && imageName
        ? { field: imageName, max: image.maxItems, required: image.required, mimeTypes: image.supportedContentTypes }
        : undefined,
    choices: entries
      .filter(([name, field]) => name !== shapeName && name !== "prompt" && enumField(field))
      .map(([name, field]) => {
        const choice = field as StringField & { enum: readonly string[] };
        return { field: name, label: humanize(name), options: choice.enum, default: choice.default };
      }),
    source: model,
  };
}

/** The size option closest in shape to `ratio`, e.g. "3:4" → "portrait_4_3". */
export function shapeForRatio(model: StudioModel, ratio: string): string | undefined {
  if (!model.shape) return undefined;
  const target = Math.log(ratioNumber(ratio));
  const distance = (option: ShapeOption) =>
    option.value === "auto" ? Number.POSITIVE_INFINITY : Math.abs(Math.log(ratioNumber(option.ratio)) - target);
  // On a tie the model's own order wins (FLUX lists "square_hd" before "square").
  return model.shape.options.reduce((best, option) => (distance(option) < distance(best) ? option : best)).value;
}

/**
 * The options to send for this model: values it accepts, the shape closest to
 * the preferred ratio when none was picked, and the model's defaults for the rest.
 */
export function resolveOptions(
  model: StudioModel,
  options: Record<string, ImageOptionValue>,
  ratio: string,
): Record<string, ImageOptionValue> {
  const resolved: Record<string, ImageOptionValue> = {};
  if (model.shape) {
    const picked = options[model.shape.field];
    const valid = model.shape.options.some((option) => option.value === picked);
    resolved[model.shape.field] = valid ? (picked as string) : (shapeForRatio(model, ratio) ?? model.shape.default);
  }
  if (model.count) {
    const picked = Number(options[model.count.field]);
    resolved[model.count.field] = Number.isInteger(picked)
      ? Math.min(model.count.max, Math.max(model.count.min, picked))
      : model.count.default;
  }
  for (const choice of model.choices) {
    const picked = options[choice.field];
    if (typeof picked === "string" && choice.options.includes(picked)) resolved[choice.field] = picked;
    else if (choice.default !== undefined) resolved[choice.field] = choice.default;
  }
  return resolved;
}

/** How many images a job with these options makes. */
export function imageCount(model: StudioModel, options: Record<string, ImageOptionValue>): number {
  return model.count ? Number(options[model.count.field] ?? model.count.default) : 1;
}

/** The shape a job's options describe, as the studio labels it. */
export function shapeOf(model: StudioModel | undefined, options: Record<string, unknown>): ShapeOption | undefined {
  const value = model?.shape ? options[model.shape.field] : undefined;
  return typeof value === "string" ? shapeOption(value) : undefined;
}

// Pricing never depends on the prompt or which images, only on how many.
const ESTIMATE_PROMPT = "estimate";
const placeholderUploadId = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

/** The `input` for `POST /v1/credits/estimate`: these options, priced with placeholder prompt and uploads. */
export function estimateInput(
  model: StudioModel,
  options: Record<string, ImageOptionValue>,
  referenceCount: number,
): Record<string, unknown> {
  const uploadIds = Array.from({ length: Math.min(referenceCount, model.references?.max ?? 0) }, (_, index) =>
    placeholderUploadId(index),
  );
  return buildInput(model.source, { prompt: ESTIMATE_PROMPT, values: options, uploadIds });
}
