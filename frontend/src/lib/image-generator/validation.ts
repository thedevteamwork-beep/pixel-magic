import {
  aspectRatios,
  defaultImageSettings,
  imageCounts,
  imageModels,
  imageStyles,
  MAX_PROMPT_LENGTH,
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_IMAGES,
  qualities,
  REFERENCE_MIME_TYPES,
  resolutions,
} from "@/constants/image-generator";
import type { ImageGenerationRequest, ReferenceDescriptor } from "@/types/image-generator";

export type ImageGenerationValidation =
  | { ok: true; data: ImageGenerationRequest }
  | { ok: false; error: { code: "VALIDATION_ERROR"; message: string; fields?: Record<string, string> } };

const settingKeys = new Set([...Object.keys(defaultImageSettings), "references"]);
const referenceKeys = new Set(["id", "mimeType", "size"]);
const MAX_SEED = 4_294_967_295;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Accept descriptors only; uploaded files and remote URLs never enter this demo API. */
export function validateImageGenerationRequest(input: unknown): ImageGenerationValidation {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Send an object containing image settings and reference metadata." },
    };
  }

  const record = input;
  const fields: Record<string, string> = {};
  if (Object.keys(input).some((key) => !settingKeys.has(key))) {
    fields.request = "Only image settings and reference descriptors are accepted.";
  }

  function choice<T extends string>(field: string, options: readonly T[]): T {
    const value = record[field];
    if (typeof value === "string" && options.includes(value as T)) return value as T;
    fields[field] = "Choose a supported option.";
    return options[0];
  }

  function text(field: string, maximum: number, required = false): string {
    const value = record[field];
    if (typeof value !== "string") {
      fields[field] = "Enter text for this setting.";
      return "";
    }
    const normalized = value.trim();
    if (required && !normalized) fields[field] = "Describe the image you want to explore.";
    else if (normalized.length > maximum) fields[field] = `Use ${maximum} characters or fewer.`;
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

  const model = choice(
    "model",
    imageModels.map((item) => item.id),
  );
  const prompt = text("prompt", MAX_PROMPT_LENGTH, true);
  const mode = choice("mode", ["create", "edit"] as const);
  const aspectRatio = choice("aspectRatio", aspectRatios);
  const resolution = choice("resolution", resolutions);
  const quality = choice("quality", qualities);
  const count = integer("count", 1, 4);
  if (!imageCounts.some((value) => value === count)) fields.count = "Choose a supported number of images.";
  const queue = choice("queue", ["credits", "unlimited"] as const);
  const style = choice("style", imageStyles);
  const seed = input.seed === null ? null : integer("seed", 0, MAX_SEED);
  const negativePrompt = text("negativePrompt", 1000);
  const enhancePrompt = boolean("enhancePrompt");
  const privateOutput = boolean("private");
  const format = choice("format", ["png", "jpeg", "webp"] as const);
  const background = choice("background", ["auto", "opaque", "transparent"] as const);
  const references: ReferenceDescriptor[] = [];

  if (!Array.isArray(input.references)) {
    fields.references = "Provide an array of reference descriptors.";
  } else if (input.references.length > MAX_REFERENCE_IMAGES) {
    fields.references = `Use up to ${MAX_REFERENCE_IMAGES} references.`;
  } else {
    const ids = new Set<string>();
    input.references.forEach((reference: unknown, index: number) => {
      const field = `references.${index}`;
      if (!isRecord(reference) || Object.keys(reference).some((key) => !referenceKeys.has(key))) {
        fields[field] = "Each reference may contain only id, mimeType, and size.";
        return;
      }
      const { id, mimeType, size } = reference;
      if (
        typeof id !== "string" ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id) ||
        /^(?:https?:|data:|blob:)/i.test(id)
      ) {
        fields[`${field}.id`] = "Use a reference ID of 1–128 letters, numbers, or ID punctuation.";
      } else if (ids.has(id)) {
        fields[`${field}.id`] = "Reference IDs must be unique.";
      } else ids.add(id);
      if (typeof mimeType !== "string" || !REFERENCE_MIME_TYPES.some((value) => value === mimeType)) {
        fields[`${field}.mimeType`] = "Use a JPEG, PNG, or WebP reference.";
      }
      if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_REFERENCE_BYTES) {
        fields[`${field}.size`] = `Each reference must be no larger than ${MAX_REFERENCE_BYTES} bytes.`;
      }
      if (!Object.keys(fields).some((key) => key === field || key.startsWith(`${field}.`))) {
        references.push({ id: id as string, mimeType: mimeType as string, size: size as number });
      }
    });
  }
  if (mode === "edit" && references.length === 0 && !fields.references) {
    fields.references = "Add a reference image to explore an edit.";
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Check the image settings and try again.", fields },
    };
  }

  return {
    ok: true,
    data: {
      model,
      prompt,
      mode,
      aspectRatio,
      resolution,
      quality,
      count,
      queue,
      style,
      seed,
      negativePrompt,
      enhancePrompt,
      private: privateOutput,
      format,
      background,
      references,
    },
  };
}
