import type { Deps } from "../../deps.js";
import { priceTier } from "../../credits/tieredCredits.js";
import { AppError } from "../../lib/errors.js";
import type { ModelDefinition } from "../../models/types.js";

/** Throws 422 when the number of uploads is outside what the model takes. */
export function assertUploadCount(
  model: ModelDefinition,
  uploadCount: number,
): void {
  if (uploadCount < model.uploads.min || uploadCount > model.uploads.max) {
    throw new AppError(
      422,
      "VALIDATION_FAILED",
      `This model takes ${model.uploads.min} to ${model.uploads.max} uploads`,
    );
  }
}

/**
 * The price of one job. Job creation and the estimate endpoint both call
 * this, so what is shown is what is reserved. The tier total can be
 * fractional; it is rounded up here, once.
 */
export function estimateCredits(
  deps: Deps,
  model: ModelDefinition,
  p: { options: unknown; uploadCount: number },
): {
  creditsPerJob: number;
  tier: string;
  breakdown: ReturnType<typeof priceTier>["breakdown"];
} {
  assertUploadCount(model, p.uploadCount);
  const entry = deps.creditMapping[model.key];
  if (!entry) throw new Error(`No credit mapping for model ${model.key}`);
  const options = model.options.parse(p.options ?? {});
  const facts = model.billingInputs({ options, uploadCount: p.uploadCount });
  const { tier, total, breakdown } = priceTier(entry, facts);
  return { creditsPerJob: Math.ceil(total), tier, breakdown };
}

/** The cheapest and the dearest job for `GET /v1/models`. */
export function creditRange(
  deps: Deps,
  model: ModelDefinition,
): { min: number; max: number } {
  const entry = deps.creditMapping[model.key];
  if (!entry) throw new Error(`No credit mapping for model ${model.key}`);
  const { min, max } = model.billingRange();
  return {
    min: Math.ceil(priceTier(entry, min).total),
    max: Math.ceil(priceTier(entry, max).total),
  };
}
