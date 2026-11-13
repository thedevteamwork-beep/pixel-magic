import {
  calculateUpscaleOutput,
  isSupportedUpscaleContentType,
  isWithinUpscaleLimits,
  MAX_UPSCALE_BYTES,
} from "./limits";
import { getUpscaleModel, supportsFaceEnhancement, supportsUpscaleTuning, UPSCALE_SETTING_KEYS } from "./models";
import type { UpscaleFactor, UpscaleModelId, UpscaleOutput, UpscaleRequest, UpscaleSource } from "./types";

export type UpscaleValidation =
  | { ok: true; data: UpscaleRequest; output: UpscaleOutput }
  | { ok: false; error: { code: "VALIDATION_ERROR"; message: string; fields: Record<string, string> } };

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const present = Object.keys(record);
  return present.length === keys.length && keys.every((key) => Object.hasOwn(record, key));
}

/** Accept exact, model-relevant settings. Invalid callers are never normalized. */
export function validateUpscaleRequest(input: unknown): UpscaleValidation {
  const fields: Record<string, string> = {};
  const failure = (): UpscaleValidation => ({
    ok: false,
    error: { code: "VALIDATION_ERROR", message: "Check the image and upscale settings, then try again.", fields },
  });
  if (!isRecord(input)) {
    fields.request = "Send source metadata and the selected upscale settings.";
    return failure();
  }
  if (!hasExactKeys(input, ["source", ...UPSCALE_SETTING_KEYS]))
    fields.request = "Send only source metadata and the supported upscale settings. Output is automatically PNG.";
  if (!isRecord(input.source) || !hasExactKeys(input.source, ["width", "height", "contentType", "size"])) {
    fields.source = "Source metadata must contain only width, height, contentType, and size.";
  }
  const source = isRecord(input.source) ? input.source : {};
  if (
    typeof source.width !== "number" ||
    typeof source.height !== "number" ||
    !isWithinUpscaleLimits(source.width, source.height)
  ) {
    fields["source.dimensions"] = "Use positive whole-pixel dimensions up to 8,192 per side and 32 megapixels.";
  }
  if (typeof source.contentType !== "string" || !isSupportedUpscaleContentType(source.contentType))
    fields["source.contentType"] = "Choose a JPG, PNG, or WebP image.";
  if (
    typeof source.size !== "number" ||
    !Number.isSafeInteger(source.size) ||
    source.size <= 0 ||
    source.size > MAX_UPSCALE_BYTES
  )
    fields["source.size"] = "Choose a nonempty image no larger than 20 MiB.";
  const model = typeof input.model === "string" ? getUpscaleModel(input.model) : undefined;
  if (!model) fields.model = "Choose a supported upscale model.";
  if (!model?.factors.some((factor) => factor === input.upscale_factor))
    fields.upscale_factor = "Choose an available factor for this model. 16× is not available.";
  const preset = typeof input.preset === "string" ? input.preset : null;
  if (model?.presets.length) {
    if (!model.presets.some((option) => option.value === input.preset))
      fields.preset = "Choose a supported preset for this model.";
  } else if (input.preset !== null) fields.preset = "This model does not use a preset; send null.";
  const tuning = model ? supportsUpscaleTuning(model.id, preset) : false;
  for (const field of ["sharpness", "denoise"] as const) {
    const value = input[field];
    if (tuning) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)
        fields[field] = "Use a percentage from 0 to 100.";
    } else if (value !== null) fields[field] = "This preset does not use this control; send null.";
  }
  if (model && supportsFaceEnhancement(model.id, preset)) {
    if (typeof input.face_enhancement !== "boolean")
      fields.face_enhancement = "Choose true or false for face enhancement.";
  } else if (input.face_enhancement !== null)
    fields.face_enhancement = "This preset does not use manual face enhancement; send null.";
  if (Object.keys(fields).length) return failure();

  const data: UpscaleRequest = {
    source: {
      width: source.width,
      height: source.height,
      contentType: source.contentType,
      size: source.size,
    } as UpscaleSource,
    model: input.model as UpscaleModelId,
    upscale_factor: input.upscale_factor as UpscaleFactor,
    preset: input.preset as string | null,
    sharpness: input.sharpness as number | null,
    denoise: input.denoise as number | null,
    face_enhancement: input.face_enhancement as boolean | null,
  };
  try {
    return { ok: true, data, output: calculateUpscaleOutput(data.source, data.upscale_factor) };
  } catch (error) {
    fields.upscale_factor = error instanceof Error ? error.message : "Choose a smaller output.";
    return failure();
  }
}
